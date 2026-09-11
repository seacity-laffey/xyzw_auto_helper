(function () {
  'use strict';
  if (location.protocol !== 'xyzw:') return;
  var helperOrigin = 'xyzw://app';
  var binId = new URLSearchParams(location.search).get('bin_id');
  window.xyzwGameReady = new Promise(function (resolve, reject) {
    var timer = setTimeout(function () {
      window.removeEventListener('message', receive);
      reject(new Error('登录资料加载超时，请刷新窗口'));
    }, 15000);
    function receive(event) {
      var message = event.data;
      if (event.source !== window.parent || event.origin !== helperOrigin
        || message?.source !== 'xyzw-helper' || message.type !== 'game-bootstrap-init'
        || message.binId !== binId) return;
      clearTimeout(timer);
      window.removeEventListener('message', receive);
      if (typeof message.hex !== 'string' || !/^(?:[0-9a-f]{2})+$/i.test(message.hex) || message.hex.length > 2 * 1024 * 1024) {
        reject(new Error('未找到此账号的 BIN，请从上号器导入后刷新'));
        return;
      }
      // 游戏的 BIN 兼容接口只在当前页面内存中保存一个账号，不复制助手账号库。
      var values = new Map([
        ['current_bin_id', binId],
        ['bin_file_list', JSON.stringify([{ id: binId, name: String(message.name || binId), byteLength: message.hex.length / 2 }])],
        ['bin_data_' + binId, message.hex],
      ]);
      var storage = localStorage;
      var prototype = Object.getPrototypeOf(storage);
      var getItem = prototype.getItem;
      var setItem = prototype.setItem;
      var removeItem = prototype.removeItem;
      function isBinKey(key) { return key === 'current_bin_id' || key === 'bin_file_list' || key.startsWith('bin_data_'); }
      prototype.getItem = function (key) {
        key = String(key);
        if (this === storage && isBinKey(key)) return values.get(key) ?? null;
        return getItem.call(this, key);
      };
      prototype.setItem = function (key, value) {
        if (this === storage && isBinKey(String(key))) return;
        return setItem.call(this, key, value);
      };
      prototype.removeItem = function (key) {
        if (this === storage && isBinKey(String(key))) return;
        return removeItem.call(this, key);
      };
      resolve();
    }
    window.addEventListener('message', receive);
    window.parent.postMessage({ source: 'xyzw-embedded-game', type: 'game-bootstrap-ready', binId: binId }, helperOrigin);
  });
})();
