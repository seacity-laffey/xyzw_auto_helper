export const PROTOCOL_OBSERVER_MESSAGE_SOURCE = "xyzw-embedded-game";
export const PROTOCOL_OBSERVER_CONTROL_SOURCE = "xyzw-helper";
export const PROTOCOL_OBSERVER_MAX_ENTRIES = 2000;

export function base64ToArrayBuffer(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

export function toJsonSafe(value, seen = new WeakSet()) {
  if (typeof value === "bigint")
    return value.toString();
  if (value === null || typeof value !== "object")
    return value;
  if (value instanceof Date)
    return value.toISOString();
  if (value instanceof ArrayBuffer) {
    return { type: "ArrayBuffer", byteLength: value.byteLength };
  }
  if (ArrayBuffer.isView(value)) {
    return Array.from(value);
  }
  if (seen.has(value))
    return "[Circular]";
  seen.add(value);

  const output = Array.isArray(value) ? [] : {};
  for (const key of Object.keys(value)) {
    output[key] = toJsonSafe(value[key], seen);
  }
  return output;
}

export function decodeProtocolObserverEntry(entry, parser) {
  if (
    entry?.transport !== "ws"
    || entry?.payload?.kind !== "binary"
    || !entry.payload.base64
    || entry.payload.truncated
    || entry.payload.byteLength <= 4
    || typeof parser !== "function"
  ) {
    return entry;
  }

  try {
    const packet = parser(base64ToArrayBuffer(entry.payload.base64), "auto");
    const raw = packet?._raw || packet;
    let body;
    try {
      body = packet?.rawData;
    } catch (error) {
      body = {
        decodeError: error instanceof Error ? error.message : String(error),
      };
    }

    return {
      ...entry,
      decoded: toJsonSafe({
        cmd: packet?.cmd || raw?.cmd,
        seq: packet?.seq ?? raw?.seq,
        ack: packet?.ack ?? raw?.ack,
        code: packet?.code ?? raw?.code,
        error: packet?.error ?? raw?.error,
        time: packet?.time ?? raw?.time,
        body,
      }),
    };
  } catch (error) {
    return {
      ...entry,
      decodeError: error instanceof Error ? error.message : String(error),
    };
  }
}

export function createProtocolObserverExport(
  entries,
  startedAt,
  endedAt = new Date(),
) {
  return {
    schemaVersion: 1,
    generatedAt: endedAt.toISOString(),
    capture: {
      startedAt: startedAt ? startedAt.toISOString() : null,
      endedAt: endedAt.toISOString(),
      entryCount: entries.length,
    },
    entries: toJsonSafe(entries),
  };
}
