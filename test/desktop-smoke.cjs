// 使用临时数据目录，不读取用户账号；可在 macOS / Windows 原生运行。
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
process.env.XYZW_SMOKE_USER_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'xyzw-smoke-'));
app.setAppPath(root);
require('../desktop/main.cjs');
const timeout = setTimeout(() => { console.error('Desktop smoke timed out'); app.exit(1); }, 60000);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn) {
  for (let i = 0; i < 100; i++) { if (await fn()) return; await wait(100); }
  throw new Error('Condition timed out');
}
app.whenReady().then(async () => {
  try {
    await until(() => BrowserWindow.getAllWindows().length > 0);
    const win = BrowserWindow.getAllWindows()[0];
    const evaluate = code => win.webContents.executeJavaScript(code);
    await until(() => evaluate('document.querySelector("#app")?.textContent.includes("批量")'));
    assert.deepEqual(await evaluate('({desktop: window.desktop.isDesktop, node: typeof require, origin: location.origin})'), { desktop: true, node: 'undefined', origin: 'xyzw://app' });
    const preferences = win.webContents.getLastWebPreferences();
    for (const key of ['sandbox', 'contextIsolation', 'webSecurity']) assert.equal(preferences[key], true);
    assert.equal(preferences.nodeIntegration, false);
    assert.equal(win.webContents.getBackgroundThrottling(), false);
    assert.equal(await evaluate('fetch("/game/index.html").then(r => r.status)'), 404);
    assert.equal(await evaluate('fetch("/_worker.js").then(r => r.status)'), 404);
    assert.equal(await evaluate('fetch("/api/hortor/arbitrary").then(r => r.status)'), 404);
    console.log('PASS: local frontend, sandbox and resource policy');
    const backupSource = fs.readFileSync(path.join(root, 'src/utils/backup.js'), 'utf8');
    const storageResult = await evaluate(`(async () => {
      ${backupSource.replace(/^export /gm, '')}
      const backup = {format:'xyzw-backup',version:1,localStorage:{'smoke-fixture':'persistent'},databases:encodeValue({xyzw:{tokens:[{id:'fixture',data:new Uint8Array([0,128,255]).buffer,createdAt:new Date('2026-09-08'),updatedAt:new Date('2026-09-08')}]},xyzw_token_db:{kv:[],gameTokens:[]}})};
      await restoreBackup(backup);
      const after = await createBackup();
      return JSON.stringify(after.databases) === JSON.stringify(backup.databases) && after.localStorage['smoke-fixture'] === 'persistent';
    })()`);
    assert.equal(storageResult, true);
    await evaluate('window.__smokeBatch = document.querySelector(".batch-daily-tasks")');
    console.log('PASS: binary backup round trip');
    await evaluate('document.querySelector("#app").__vue_app__.config.globalProperties.$router.push("/tokens")');
    await until(() => evaluate('location.pathname === "/tokens"'));
    assert.equal(await evaluate('window.__smokeBatch === document.querySelector(".batch-daily-tasks")'), true);
    await evaluate('document.querySelector("#app").__vue_app__.config.globalProperties.$router.push("/game")');
    await until(() => evaluate('location.pathname === "/game"'));
    await evaluate('document.querySelector("#app").__vue_app__.config.globalProperties.$router.push("/batch-tasks")');
    await until(() => evaluate('location.pathname === "/batch-tasks" && Boolean(document.querySelector(".batch-daily-tasks"))'));
    assert.equal(await evaluate('window.__smokeBatch === document.querySelector(".batch-daily-tasks")'), true);
    console.log('PASS: batch runtime survives account and game navigation');
    await evaluate('document.querySelector(".sidebar-toggle").click()');
    assert.equal(await evaluate('document.querySelector(".app-sider").getBoundingClientRect().width'), 64);
    assert.equal(await evaluate('document.querySelector(".workspace").getBoundingClientRect().left'), 64);
    await win.loadURL('xyzw://app/tokens');
    await until(() => evaluate('Boolean(document.querySelector(".sidebar-toggle"))'));
    assert.equal(await evaluate('document.querySelector(".sidebar-toggle").getAttribute("aria-expanded")'), 'false');
    fs.writeFileSync(path.join(process.env.XYZW_SMOKE_USER_DATA, 'sidebar-collapsed.png'), (await win.webContents.capturePage()).toPNG());
    await evaluate('document.querySelector(".sidebar-toggle").click()');
    assert.equal(await evaluate('document.querySelector(".app-sider").getBoundingClientRect().width'), 320);
    console.log('PASS: sidebar collapse, expand and reload persistence');
    win.webContents.session.webRequest.onBeforeRequest((details, callback) => callback({ cancel: new URL(details.url).host.startsWith('game-') }));
    await evaluate('localStorage.setItem("gameTokens", JSON.stringify([{id:"layout-fixture",name:"布局测试",serverId:"3136",token:"fixture"}]))');
    await win.loadURL('xyzw://app/game?bin_id=layout-fixture');
    await until(() => evaluate('Boolean(document.querySelector(".game-start-state button"))'));
    assert.equal(await evaluate('document.querySelectorAll(".game-iframe").length'), 0);
    for (const [width, height] of [[1440, 960], [1000, 800]]) {
      win.setSize(width, height);
      await wait(250);
      assert.equal(await evaluate(`(() => {
        const button = document.querySelector('.game-start-state button').getBoundingClientRect();
        const view = document.querySelector('.game-viewport').getBoundingClientRect();
        return button.width > 0 && button.height > 0 && button.left >= view.left && button.right <= view.right
          && button.top >= view.top && button.bottom <= view.bottom;
      })()`), true);
      fs.writeFileSync(path.join(process.env.XYZW_SMOKE_USER_DATA, `game-start-${width}.png`), (await win.webContents.capturePage()).toPNG());
    }
    await evaluate('document.querySelector(".game-start-state button").click()');
    await until(() => evaluate('Boolean(document.querySelector(".game-iframe"))'));
    for (const [width, height] of [[1440, 960], [1000, 800]]) {
      win.setSize(width, height);
      await wait(250);
      const bounds = await evaluate(`(() => {
        const frame = document.querySelector('.game-iframe').getBoundingClientRect();
        const view = document.querySelector('.game-viewport').getBoundingClientRect();
        return {width:frame.width,height:frame.height,viewWidth:view.width,viewHeight:view.height,left:frame.left-view.left};
      })()`);
      assert.equal(bounds.height, 750);
      assert.equal(bounds.width, 421.875);
      assert.ok(bounds.width <= bounds.viewWidth + 1);
      assert.ok(bounds.width <= bounds.height * 9 / 16 + 1);
      assert.ok(Math.abs(bounds.left - (bounds.viewWidth - bounds.width) / 2) < 1);
    }
    assert.equal(await evaluate(`document.querySelector('[aria-label="游戏窗口尺寸"]').value`), 'default');
    assert.equal(await evaluate(`document.querySelector('[aria-label="编辑排序"]') === null && ![...document.querySelectorAll('.toolbar-actions button')].some(b=>b.textContent.includes('协议观察器'))`), true);
    await evaluate(`(() => { window.__sizeFrame = document.querySelector('.game-iframe'); const select = document.querySelector('[aria-label="游戏窗口尺寸"]'); select.value='small'; select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    for (const [width,height] of [[1440,960],[1000,800]]) {
      win.setSize(width,height); await wait(250);
      assert.deepEqual(await evaluate(`({width:document.querySelector('.game-iframe').getBoundingClientRect().width,height:document.querySelector('.game-iframe').getBoundingClientRect().height})`), {width:281.25,height:500});
    }
    await evaluate(`(() => { const select = document.querySelector('[aria-label="游戏窗口尺寸"]'); select.value='default'; select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await until(() => evaluate(`document.querySelector('.game-iframe').getBoundingClientRect().height === 750`));
    assert.equal(await evaluate(`window.__sizeFrame === document.querySelector('.game-iframe')`), true);
    console.log('PASS: default and Small sizes remain fixed across resizes without replacing iframe; advanced tools hidden by default');
    const beforeCollapse = await evaluate(`({
      frame: document.querySelector('.game-iframe').src,
      height: document.querySelector('.game-grid').getBoundingClientRect().height
    })`);
    await evaluate(`window.__toolbarTestFrame = document.querySelector('.game-iframe'); document.querySelector('[aria-label="隐藏顶部工具栏"]').click()`);
    await until(() => evaluate(`Boolean(document.querySelector('[aria-label="展开顶部工具栏"]'))`));
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.game-toolbar')).display`), 'none');
    assert.equal(await evaluate(`(() => {
      const expand = document.querySelector('.toolbar-expand').getBoundingClientRect();
      const close = document.querySelector('.game-window-actions button[title="关闭此窗口"]').getBoundingClientRect();
      return Math.abs((expand.left + expand.right) / 2 - innerWidth / 2) < 1
        && (expand.right <= close.left || expand.bottom <= close.top || expand.left >= close.right);
    })()`), true, 'expand button is centered and does not overlap the game close button');
    assert.equal(await evaluate(`window.__toolbarTestFrame === document.querySelector('.game-iframe')`), true);
    assert.equal(await evaluate(`document.querySelector('.game-iframe').src`), beforeCollapse.frame);
    assert.ok(await evaluate(`document.querySelector('.game-grid').getBoundingClientRect().height > ${beforeCollapse.height}`));
    await evaluate(`document.querySelector('[aria-label="展开顶部工具栏"]').click()`);
    await until(() => evaluate(`getComputedStyle(document.querySelector('.game-toolbar')).display !== 'none'`));
    assert.equal(await evaluate(`window.__toolbarTestFrame === document.querySelector('.game-iframe')`), true);
    console.log('PASS: toolbar collapses and expands, adds game space, and preserves the existing iframe');
    win.webContents.session.webRequest.onBeforeRequest(null);
    assert.equal(await evaluate(`document.querySelector('.game-iframe').getBoundingClientRect().height`), 750);
    console.log('PASS: fixed 750px game height and 9:16 width survive window resize and toolbar toggle');

    await win.loadURL('xyzw://app/migration.html');
    assert.equal(await evaluate('Boolean(document.querySelector("#export"))'), true);
    assert.equal(await evaluate('localStorage.getItem("smoke-fixture")'), 'persistent');
    await win.loadURL('xyzw://app/tokens');
    await until(() => evaluate('Boolean(document.querySelector("#app")?.textContent.trim())'));
    const png = await win.webContents.capturePage();
    const screenshot = path.join(process.env.XYZW_SMOKE_USER_DATA, 'smoke.png');
    fs.writeFileSync(screenshot, png.toPNG());
    console.log(JSON.stringify({ result: 'PASS', platform: process.platform, arch: process.arch, electron: process.versions.electron, screenshot, userData: process.env.XYZW_SMOKE_USER_DATA }));
    clearTimeout(timeout); app.exit(0);
  } catch (error) { console.error(error); clearTimeout(timeout); app.exit(1); }
});
