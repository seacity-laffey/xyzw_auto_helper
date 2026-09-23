(function () {
  'use strict';
  if (location.protocol === 'xyzw:') return;
  // 沿用 dev 的账号路由；网页 iframe 全部游戏存储按账号隔离。
  window.xyzwGameReady = Promise.resolve().then(function () {
    var binId = new URLSearchParams(location.search).get('bin_id');
    if (!binId) throw new Error('未指定游戏账号，请从助手重新打开');
    var storage = window.localStorage;
    var hex = storage.getItem('bin_data_' + binId);
    if (!hex || !/^(?:[0-9a-f]{2})+$/i.test(hex)) throw new Error('未找到此账号的 BIN，请重新导入');
    var scope = 'mg-' + Array.from(new TextEncoder().encode(binId), function (byte) { return byte.toString(16).padStart(2, '0'); }).join('');
    if (!window.MultiGameStorageBridge.validateScope(scope)) throw new Error('账号标识无效');
    var list;
    try { list = JSON.parse(storage.getItem('bin_file_list') || '[]'); } catch { list = []; }
    var account = Array.isArray(list) && list.find(function (item) { return item.id === binId; });
    var prefix = 'multi-game:' + scope + ':';
    storage.setItem(prefix + 'current_bin_id', binId);
    storage.setItem(prefix + 'bin_data_' + binId, hex);
    storage.setItem(prefix + 'bin_file_list', JSON.stringify([account || { id: binId, name: binId }]));
    window.MultiGameStorageBridge.install(window, scope);
  });
})();
