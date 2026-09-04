(function () {
  "use strict";

  var binId = new URLSearchParams(window.location.search).get("bin_id");
  if (!binId) return;

  var MESSAGE_SOURCE = "xyzw-embedded-game";
  var CONTROL_SOURCE = "xyzw-helper";
  var MAX_PAYLOAD_BYTES = 1024 * 1024;
  var observerActive = false;
  var inputSyncEnabled = false;
  var inputSyncMaster = false;
  var lastTouchInputAt = 0;
  var nextEntryId = 0;
  var nextGestureId = 0;
  var activeMouseGesture = null;
  var activeTouchGesture = null;
  var pendingMove = null;
  var pendingMoveFrame = 0;
  var lastInputGestureId = "";
  var lastInputSequence = -1;

  if (window.parent !== window) {
    var embeddedToolStyle = document.createElement("style");
    embeddedToolStyle.id = "embedded-bin-tool-style";
    embeddedToolStyle.textContent = "#binTool{display:none!important}";
    document.head.appendChild(embeddedToolStyle);
  }

  function postToParent(type, data) {
    if (window.parent === window) return;
    window.parent.postMessage(
      Object.assign({ source: MESSAGE_SOURCE, type: type, binId: binId }, data),
      window.location.origin,
    );
  }

  function redactKey(key) {
    return (
      /authorization|cookie|token|session|ticket|secret|password|passwd/i.test(
        key,
      ) || /^p$/i.test(key)
    );
  }

  function sanitizeUrl(value) {
    try {
      var parsed = new URL(String(value), window.location.href);
      parsed.searchParams.forEach(function (_, key) {
        if (redactKey(key)) parsed.searchParams.set(key, "[REDACTED]");
      });
      return parsed.href;
    } catch (_) {
      return String(value || "").replace(
        /([?&](?:token|roleToken|p|ticket|session)=)[^&#]*/gi,
        "$1[REDACTED]",
      );
    }
  }

  function sanitizeHeaders(headers) {
    var result = {};
    if (!headers) return result;
    try {
      if (typeof headers === "string") {
        headers
          .trim()
          .split(/[\r\n]+/)
          .forEach(function (line) {
            var separator = line.indexOf(":");
            if (separator <= 0) return;
            var key = line.slice(0, separator).trim();
            var value = line.slice(separator + 1).trim();
            result[key] = redactKey(key) ? "[REDACTED]" : value;
          });
        return result;
      }
      new Headers(headers).forEach(function (value, key) {
        result[key] = redactKey(key) ? "[REDACTED]" : value;
      });
    } catch (_) {}
    return result;
  }

  function bytesToBase64(bytes) {
    var binary = "";
    var chunkSize = 0x8000;
    for (var offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode.apply(
        null,
        bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)),
      );
    }
    return btoa(binary);
  }

  function redactJson(value, seen) {
    if (!value || typeof value !== "object") return value;
    if (seen.has(value)) return "[Circular]";
    seen.add(value);

    var output = Array.isArray(value) ? [] : {};
    Object.keys(value).forEach(function (key) {
      output[key] = redactKey(key)
        ? "[REDACTED]"
        : redactJson(value[key], seen);
    });
    return output;
  }

  function sanitizeText(text) {
    if (!text) return text;
    try {
      return JSON.stringify(redactJson(JSON.parse(text), new WeakSet()));
    } catch (_) {
      return text.replace(
        /((?:authorization|cookie|token|roleToken|session|ticket|password)\s*[=:]\s*)[^&\s,;]+/gi,
        "$1[REDACTED]",
      );
    }
  }

  function capturePayload(value) {
    if (value === undefined || value === null) {
      return Promise.resolve({ kind: "empty", byteLength: 0 });
    }
    if (typeof value === "string") {
      var encodedLength = new TextEncoder().encode(value).byteLength;
      return Promise.resolve({
        kind: "text",
        byteLength: encodedLength,
        text: sanitizeText(value.slice(0, MAX_PAYLOAD_BYTES)),
        truncated: encodedLength > MAX_PAYLOAD_BYTES,
      });
    }
    if (value instanceof Blob) {
      return value
        .slice(0, MAX_PAYLOAD_BYTES)
        .arrayBuffer()
        .then(function (buffer) {
          return {
            kind: "binary",
            byteLength: value.size,
            base64: bytesToBase64(new Uint8Array(buffer)),
            truncated: value.size > MAX_PAYLOAD_BYTES,
          };
        });
    }

    var bytes = null;
    if (value instanceof ArrayBuffer) {
      bytes = new Uint8Array(value);
    } else if (ArrayBuffer.isView(value)) {
      bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    } else if (value instanceof URLSearchParams) {
      return capturePayload(value.toString());
    } else if (value instanceof FormData) {
      var form = {};
      value.forEach(function (item, key) {
        form[key] = redactKey(key) ? "[REDACTED]" : String(item);
      });
      return capturePayload(JSON.stringify(form));
    }

    if (!bytes) {
      return capturePayload(String(value));
    }

    var captured = bytes.subarray(0, MAX_PAYLOAD_BYTES);
    return Promise.resolve({
      kind: "binary",
      byteLength: bytes.byteLength,
      base64: bytesToBase64(captured),
      truncated: bytes.byteLength > MAX_PAYLOAD_BYTES,
    });
  }

  function record(entry, payload) {
    if (!observerActive) return;
    var base = Object.assign(
      {
        id: binId + "-" + Date.now() + "-" + ++nextEntryId,
        timestamp: new Date().toISOString(),
      },
      entry,
    );
    capturePayload(payload)
      .then(function (capturedPayload) {
        if (!observerActive) return;
        postToParent("protocol-observer-entry", {
          entry: Object.assign(base, { payload: capturedPayload }),
        });
      })
      .catch(function (error) {
        postToParent("protocol-observer-entry", {
          entry: Object.assign(base, {
            captureError:
              error && error.message ? error.message : String(error),
          }),
        });
      });
  }

  function getGameCanvas() {
    return document.getElementById("GameCanvas");
  }

  function clampRatio(value) {
    return Math.max(0, Math.min(1, value));
  }

  function createGesture(kind, canvas, identifier) {
    return {
      id:
        binId +
        "-" +
        kind +
        "-" +
        Date.now() +
        "-" +
        ++nextGestureId,
      sequence: 0,
      canvas: canvas,
      identifier: identifier,
    };
  }

  function postGestureInput(input, gesture) {
    postToParent("game-input-sync-event", {
      input: Object.assign({}, input, {
        gestureId: gesture.id,
        sequence: gesture.sequence++,
      }),
    });
  }

  function flushPendingMove() {
    if (!pendingMove) return;
    var move = pendingMove;
    pendingMove = null;
    if (pendingMoveFrame) {
      cancelAnimationFrame(pendingMoveFrame);
      pendingMoveFrame = 0;
    }
    postGestureInput(move.input, move.gesture);
  }

  function sendGestureInput(input, gesture) {
    if (input.eventType === "mousemove" || input.eventType === "touchmove") {
      pendingMove = { input: input, gesture: gesture };
      if (!pendingMoveFrame) {
        pendingMoveFrame = requestAnimationFrame(function () {
          pendingMoveFrame = 0;
          flushPendingMove();
        });
      }
      return;
    }

    flushPendingMove();
    postGestureInput(input, gesture);
  }

  function getRelativeInput(canvas, clientX, clientY, clamp) {
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    var xRatio = (clientX - rect.left) / rect.width;
    var yRatio = (clientY - rect.top) / rect.height;
    if (!clamp && (xRatio < 0 || xRatio > 1 || yRatio < 0 || yRatio > 1))
      return null;
    return {
      xRatio: clamp ? clampRatio(xRatio) : xRatio,
      yRatio: clamp ? clampRatio(yRatio) : yRatio,
    };
  }

  function captureMouseInput(event) {
    if (!inputSyncEnabled || !inputSyncMaster) return;
    if (Date.now() - lastTouchInputAt < 800) return;

    var canvas = getGameCanvas();
    if (event.type === "mousedown") {
      if (!canvas || event.target !== canvas) return;
      activeMouseGesture = createGesture("mouse", canvas, 0);
    } else if (!activeMouseGesture) {
      return;
    }

    var gesture = activeMouseGesture;
    if (event.type === "mousemove" && event.buttons === 0) return;
    var position = getRelativeInput(
      gesture.canvas,
      event.clientX,
      event.clientY,
      event.type !== "mousedown",
    );
    if (!position) return;

    sendGestureInput(
      {
        eventType: event.type,
        xRatio: position.xRatio,
        yRatio: position.yRatio,
        button: event.button,
        buttons: event.buttons,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
      },
      gesture,
    );

    if (event.type === "mouseup") activeMouseGesture = null;
  }

  function captureTouchInput(event) {
    if (!inputSyncEnabled || !inputSyncMaster) return;
    var canvas = getGameCanvas();
    if (event.type === "touchstart") {
      if (!canvas || event.target !== canvas || !event.changedTouches.length)
        return;
      activeTouchGesture = createGesture(
        "touch",
        canvas,
        event.changedTouches[0].identifier,
      );
    } else if (!activeTouchGesture) {
      return;
    }

    var gesture = activeTouchGesture;
    var touch = Array.prototype.find.call(event.changedTouches, function (item) {
      return item.identifier === gesture.identifier;
    });
    if (!touch) return;
    var position = getRelativeInput(
      gesture.canvas,
      touch.clientX,
      touch.clientY,
      event.type !== "touchstart",
    );
    if (!position) return;

    lastTouchInputAt = Date.now();
    sendGestureInput(
      {
        eventType: event.type,
        xRatio: position.xRatio,
        yRatio: position.yRatio,
        button: 0,
        buttons:
          event.type === "touchend" || event.type === "touchcancel" ? 0 : 1,
        identifier: touch.identifier,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
      },
      gesture,
    );

    if (event.type === "touchend" || event.type === "touchcancel")
      activeTouchGesture = null;
  }

  function dispatchMouseInput(input) {
    if (!inputSyncEnabled || inputSyncMaster || !input) return;
    if (["mousedown", "mousemove", "mouseup"].indexOf(input.eventType) < 0)
      return;

    var canvas = getGameCanvas();
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    var xRatio = Number(input.xRatio);
    var yRatio = Number(input.yRatio);
    if (
      !isFinite(xRatio) ||
      !isFinite(yRatio) ||
      xRatio < 0 ||
      xRatio > 1 ||
      yRatio < 0 ||
      yRatio > 1
    )
      return;

    if (input.eventType === "mousedown") canvas.focus();
    canvas.dispatchEvent(
      new MouseEvent(input.eventType, {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: rect.left + rect.width * xRatio,
        clientY: rect.top + rect.height * yRatio,
        button: Number(input.button) || 0,
        buttons: Number(input.buttons) || 0,
        altKey: Boolean(input.altKey),
        ctrlKey: Boolean(input.ctrlKey),
        metaKey: Boolean(input.metaKey),
        shiftKey: Boolean(input.shiftKey),
      }),
    );
  }

  function dispatchTouchInput(input) {
    if (!inputSyncEnabled || inputSyncMaster || !input) return;
    if (
      ["touchstart", "touchmove", "touchend", "touchcancel"].indexOf(
        input.eventType,
      ) < 0
    )
      return;

    var canvas = getGameCanvas();
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var xRatio = Number(input.xRatio);
    var yRatio = Number(input.yRatio);
    if (
      !isFinite(xRatio) ||
      !isFinite(yRatio) ||
      xRatio < 0 ||
      xRatio > 1 ||
      yRatio < 0 ||
      yRatio > 1
    )
      return;

    var clientX = rect.left + rect.width * xRatio;
    var clientY = rect.top + rect.height * yRatio;
    try {
      var touch = new Touch({
        identifier: Number(input.identifier) || 0,
        target: canvas,
        clientX: clientX,
        clientY: clientY,
        pageX: clientX + window.scrollX,
        pageY: clientY + window.scrollY,
        screenX: clientX,
        screenY: clientY,
      });
      var activeTouches =
        input.eventType === "touchend" || input.eventType === "touchcancel"
          ? []
          : [touch];
      canvas.dispatchEvent(
        new TouchEvent(input.eventType, {
          bubbles: true,
          cancelable: true,
          changedTouches: [touch],
          targetTouches: activeTouches,
          touches: activeTouches,
          altKey: Boolean(input.altKey),
          ctrlKey: Boolean(input.ctrlKey),
          metaKey: Boolean(input.metaKey),
          shiftKey: Boolean(input.shiftKey),
        }),
      );
    } catch (_) {
      dispatchMouseInput(
        Object.assign({}, input, {
          eventType:
            input.eventType === "touchstart"
              ? "mousedown"
              : input.eventType === "touchend" ||
                  input.eventType === "touchcancel"
                ? "mouseup"
                : "mousemove",
        }),
      );
    }
  }

  function dispatchInput(input) {
    if (input && input.gestureId && Number.isInteger(input.sequence)) {
      if (input.gestureId !== lastInputGestureId) {
        lastInputGestureId = input.gestureId;
        lastInputSequence = -1;
      }
      if (input.sequence <= lastInputSequence) return;
      lastInputSequence = input.sequence;
    }
    if (input && String(input.eventType).indexOf("touch") === 0)
      dispatchTouchInput(input);
    else dispatchMouseInput(input);
  }

  function managePointerCapture(event) {
    var canvas = getGameCanvas();
    if (!canvas || event.target !== canvas) return;
    try {
      if (event.type === "pointerdown") canvas.setPointerCapture(event.pointerId);
      else if (canvas.hasPointerCapture(event.pointerId))
        canvas.releasePointerCapture(event.pointerId);
    } catch (_) {}
  }

  ["mousedown", "mousemove", "mouseup"].forEach(function (eventType) {
    window.addEventListener(eventType, captureMouseInput, true);
  });
  ["touchstart", "touchmove", "touchend", "touchcancel"].forEach(function (eventType) {
    window.addEventListener(eventType, captureTouchInput, true);
  });
  ["pointerdown", "pointerup", "pointercancel"].forEach(function (eventType) {
    window.addEventListener(eventType, managePointerCapture, true);
  });

  window.addEventListener("message", function (event) {
    if (
      event.origin !== window.location.origin ||
      event.source !== window.parent
    )
      return;
    var message = event.data;
    if (!message || message.source !== CONTROL_SOURCE) return;

    if (message.type === "protocol-observer-control") {
      observerActive = message.action === "start";
      postToParent("protocol-observer-status", { active: observerActive });
      return;
    }

    if (message.type === "game-input-sync-control") {
      inputSyncEnabled = Boolean(message.enabled);
      inputSyncMaster =
        inputSyncEnabled && String(message.masterId || "") === String(binId);
      if (!inputSyncEnabled) {
        pendingMove = null;
        activeMouseGesture = null;
        activeTouchGesture = null;
        if (pendingMoveFrame) {
          cancelAnimationFrame(pendingMoveFrame);
          pendingMoveFrame = 0;
        }
      }
      postToParent("game-input-sync-status", {
        enabled: inputSyncEnabled,
        master: inputSyncMaster,
      });
      return;
    }

    if (message.type === "game-input-sync-event") {
      dispatchInput(message.input);
    }
  });

  var NativeWebSocket = window.WebSocket;
  if (NativeWebSocket) {
    function ObservedWebSocket(url, protocols) {
      var socket =
        protocols === undefined
          ? new NativeWebSocket(url)
          : new NativeWebSocket(url, protocols);
      var safeUrl = sanitizeUrl(url);

      socket.addEventListener("open", function () {
        record({
          transport: "ws",
          direction: "event",
          event: "open",
          url: safeUrl,
        });
      });
      socket.addEventListener("message", function (event) {
        record({ transport: "ws", direction: "in", url: safeUrl }, event.data);
      });
      socket.addEventListener("close", function (event) {
        record({
          transport: "ws",
          direction: "event",
          event: "close",
          url: safeUrl,
          code: event.code,
          reason: event.reason,
        });
      });

      return socket;
    }

    ObservedWebSocket.prototype = NativeWebSocket.prototype;
    Object.defineProperties(ObservedWebSocket, {
      CONNECTING: { value: NativeWebSocket.CONNECTING },
      OPEN: { value: NativeWebSocket.OPEN },
      CLOSING: { value: NativeWebSocket.CLOSING },
      CLOSED: { value: NativeWebSocket.CLOSED },
    });
    window.WebSocket = ObservedWebSocket;

    var nativeSend = NativeWebSocket.prototype.send;
    NativeWebSocket.prototype.send = function (data) {
      record(
        { transport: "ws", direction: "out", url: sanitizeUrl(this.url) },
        data,
      );
      return nativeSend.call(this, data);
    };
  }

  var nativeFetch = window.fetch;
  if (nativeFetch) {
    window.fetch = function (input, init) {
      var request = input instanceof Request ? input : null;
      var method =
        (init && init.method) || (request && request.method) || "GET";
      var url = request ? request.url : input;
      var startedAt = performance.now();
      var requestBody = init && init.body;

      record(
        {
          transport: "fetch",
          direction: "out",
          method: method.toUpperCase(),
          url: sanitizeUrl(url),
          headers: sanitizeHeaders(
            (init && init.headers) || (request && request.headers),
          ),
        },
        requestBody,
      );

      return nativeFetch.apply(this, arguments).then(function (response) {
        if (observerActive) {
          var contentType = response.headers.get("content-type") || "";
          var clone = response.clone();
          var responseData = /json|text|javascript|xml|form-urlencoded/i.test(
            contentType,
          )
            ? clone.text()
            : clone.arrayBuffer();
          responseData
            .then(function (body) {
              record(
                {
                  transport: "fetch",
                  direction: "in",
                  method: method.toUpperCase(),
                  url: sanitizeUrl(response.url || url),
                  status: response.status,
                  durationMs: Math.round(performance.now() - startedAt),
                  headers: sanitizeHeaders(response.headers),
                },
                body,
              );
            })
            .catch(function () {});
        }
        return response;
      });
    };
  }

  var NativeXMLHttpRequest = window.XMLHttpRequest;
  if (NativeXMLHttpRequest) {
    var nativeOpen = NativeXMLHttpRequest.prototype.open;
    var nativeSetRequestHeader =
      NativeXMLHttpRequest.prototype.setRequestHeader;
    var nativeXhrSend = NativeXMLHttpRequest.prototype.send;

    NativeXMLHttpRequest.prototype.open = function (method, url) {
      this.__protocolObserver = {
        method: String(method || "GET").toUpperCase(),
        url: sanitizeUrl(url),
        headers: {},
      };
      return nativeOpen.apply(this, arguments);
    };

    NativeXMLHttpRequest.prototype.setRequestHeader = function (key, value) {
      if (this.__protocolObserver) {
        this.__protocolObserver.headers[key] = redactKey(key)
          ? "[REDACTED]"
          : value;
      }
      return nativeSetRequestHeader.apply(this, arguments);
    };

    NativeXMLHttpRequest.prototype.send = function (body) {
      var meta = this.__protocolObserver || {
        method: "GET",
        url: "",
        headers: {},
      };
      meta.startedAt = performance.now();
      record(
        {
          transport: "xhr",
          direction: "out",
          method: meta.method,
          url: meta.url,
          headers: meta.headers,
        },
        body,
      );
      this.addEventListener("loadend", function () {
        var responseBody =
          this.responseType === "" || this.responseType === "text"
            ? this.responseText
            : this.response;
        record(
          {
            transport: "xhr",
            direction: "in",
            method: meta.method,
            url: sanitizeUrl(this.responseURL || meta.url),
            status: this.status,
            durationMs: Math.round(performance.now() - meta.startedAt),
            headers: sanitizeHeaders(this.getAllResponseHeaders()),
          },
          responseBody,
        );
      });
      return nativeXhrSend.apply(this, arguments);
    };
  }

  var storage = window.localStorage;
  var storagePrototype = Object.getPrototypeOf(storage);
  var getItem = storagePrototype.getItem;
  var setItem = storagePrototype.setItem;
  var removeItem = storagePrototype.removeItem;

  storagePrototype.getItem = function (key) {
    if (this === storage && key === "current_bin_id") return binId;
    return getItem.call(this, key);
  };

  storagePrototype.setItem = function (key, value) {
    if (this === storage && key === "current_bin_id") return;
    return setItem.call(this, key, value);
  };

  storagePrototype.removeItem = function (key) {
    if (this === storage && key === "current_bin_id") return;
    return removeItem.call(this, key);
  };

  postToParent("protocol-observer-ready", { active: false });
})();
