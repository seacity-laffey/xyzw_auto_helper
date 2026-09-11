(async function () {
  try {
    await window.xyzwGameReady;
    for (var source of [
      'session-bridge.js', 'patch.decrypted_readable.js', 'src/settings.da7ef.js',
      'game-defines.a175e.js', 'main.2a00e.js', 'cocos2d-js-min.a5841.js',
      'xh.js', 'sh1.js', 'diagnose_require.js',
    ]) {
      await new Promise(function (resolve, reject) {
        var script = document.createElement('script');
        script.src = source;
        script.onload = resolve;
        script.onerror = function () { reject(new Error('游戏资源加载失败，请刷新窗口')); };
        document.body.appendChild(script);
      });
    }
    window.HtmlIsLoaded = true;
    document.getElementById('splash').style.display = 'none';
    document.getElementById('GameCanvas').addEventListener('contextmenu', function (event) { event.preventDefault(); });
    window.boot();
  } catch (error) {
    var message = document.createElement('p');
    message.style.cssText = 'color:#fff;padding:32px;text-align:center;position:relative;z-index:100';
    message.textContent = error.message || '游戏加载失败，请刷新窗口';
    document.getElementById('splash').replaceChildren(message);
  }
})();
