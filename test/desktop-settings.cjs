// 两次独立启动真实主进程，使用临时配置验证设置落盘，不访问真实账号或网络。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

if (!process.versions.electron) {
  const { spawnSync } = require('node:child_process');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'xyzw-settings-'));
  for (const phase of ['write', 'read']) {
    const result = spawnSync(require('electron'), [__filename], {
      env: { ...process.env, XYZW_SMOKE_USER_DATA: profile, XYZW_SETTINGS_PHASE: phase },
      stdio: 'inherit', timeout: 45000,
    });
    assert.equal(result.status, 0, `${phase}: ${result.error || result.signal || 'failed'}`);
  }
  console.log('PASS: game settings survive a full application restart');
} else {
  const { app, BrowserWindow, protocol, session } = require('electron');
  app.setAppPath(path.resolve(__dirname, '..'));
  const handle = protocol.handle.bind(protocol);
  protocol.handle = (scheme, handler) => handle(scheme, async request => {
    const response = await handler(request);
    if (new URL(request.url).host.startsWith('game-') && response.ok) {
      return new Response('<!doctype html><title>Settings fixture</title>', {
        headers: { 'Content-Type': 'text/html' },
      });
    }
    return response;
  });
  require('../desktop/main.cjs');
  const timeout = setTimeout(() => app.exit(1), 30000);
  const pause = () => new Promise(resolve => setTimeout(resolve, 50));
  app.whenReady().then(async () => {
    try {
      session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
        callback({ cancel: /^https?:|^wss?:/.test(details.url) });
      });
      while (!BrowserWindow.getAllWindows().length) await pause();
      const win = BrowserWindow.getAllWindows()[0];
      while (win.webContents.isLoading()) await pause();
      const js = code => win.webContents.executeJavaScript(code);
      const game = await js("window.desktop.createGameSession('settings-fixture')");
      await js(`new Promise(resolve => {
        const frame = document.createElement('iframe');
        frame.onload = resolve; frame.src = ${JSON.stringify(game.url)};
        document.body.appendChild(frame);
      })`);
      const frame = win.webContents.mainFrame.frames.find(item => item.url === game.url);
      assert.ok(frame);
      if (process.env.XYZW_SETTINGS_PHASE === 'write') {
        await frame.executeJavaScript("localStorage.setItem('sound-enabled', 'false')");
      } else {
        assert.equal(await frame.executeJavaScript("localStorage.getItem('sound-enabled')"), 'false');
      }
      await js(`document.querySelector('iframe').remove(); window.desktop.releaseGameSession(${JSON.stringify(game.origin)})`);
      assert.equal((await session.defaultSession.fetch(game.url)).status, 403);
      await session.defaultSession.flushStorageData();
      clearTimeout(timeout);
      app.quit();
    } catch (error) {
      console.error(error);
      clearTimeout(timeout);
      app.exit(1);
    }
  });
}
