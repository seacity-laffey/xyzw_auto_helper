// 使用临时账号和本地游戏替身，验证真实 Electron 同源策略、CSP、IPC 和同步桥。
const { app, BrowserWindow, protocol, session, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
process.env.XYZW_SMOKE_USER_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'xyzw-isolation-'));
app.setAppPath(root);
const opened = [];
let useGameFixture = true;
shell.openExternal = async url => { opened.push(url); };
const nativeHandle = protocol.handle.bind(protocol);
const placeholderScripts = new Set(['patch.decrypted_readable.js', 'src/settings.da7ef.js', 'game-defines.a175e.js', 'cocos2d-js-min.a5841.js', 'xh.js', 'diagnose_require.js']);
protocol.handle = (scheme, handler) => nativeHandle(scheme, async request => {
  const response = await handler(request);
  const url = new URL(request.url);
  if (!useGameFixture || !url.host.startsWith('game-') || !response.ok) return response;
  const name = url.pathname.replace('/game/', '');
  let source;
  if (placeholderScripts.has(name)) source = '// local fixture';
  if (name === 'main.2a00e.js') source = `window.boot = function () {
    const canvas = document.getElementById('GameCanvas');
    canvas.style.cssText = 'width:100%;height:100%;background:#263d4b';
    window.fixtureInputs = [];
    for (const type of ['mousedown','mousemove','mouseup','touchstart','touchmove','touchend']) {
      canvas.addEventListener(type, event => { if (type === 'mousedown' || type === 'touchstart') canvas.focus(); window.fixtureInputs.push(type); });
    }
    window.fixtureReady = true;
  };`;
  return source === undefined ? response : new Response(source, { headers: response.headers });
});
require('../desktop/main.cjs');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, label) {
  for (let index = 0; index < 150; index++) { if (await fn()) return; await pause(100); }
  throw new Error(`Timed out: ${label}`);
}
const timeout = setTimeout(() => { console.error('Isolation test timed out'); app.exit(1); }, 90000);
app.whenReady().then(async () => {
  try {
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => callback({ cancel: /^https?:|^wss?:/.test(details.url) }));
    await until(() => BrowserWindow.getAllWindows().length, 'main window');
    const win = BrowserWindow.getAllWindows()[0];
    const js = code => win.webContents.executeJavaScript(code);
    const errors = [];
    win.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
    await until(() => js('Boolean(document.querySelector(".app-sider"))'), 'helper');
    await js(`localStorage.setItem('gameTokens', JSON.stringify([{id:'a',name:'测试甲-0-123',serverId:'3136',token:'private-a'},{id:'b',name:'测试乙',serverId:'3137',token:'private-b'}]));
      localStorage.setItem('bin_data_a', '01020304'); localStorage.setItem('bin_data_b', '05060708');
      localStorage.setItem('bin_file_list', JSON.stringify([{id:'a',name:'测试甲'},{id:'b',name:'测试乙'}]));
      localStorage.setItem('isolation-secret', 'helper-only');`);
    await win.loadURL('xyzw://app/game?bin_id=a&bin_id=b');
    await until(() => win.webContents.mainFrame.frames.length === 2, 'two game frames');
    const frames = () => win.webContents.mainFrame.frames;
    await until(async () => (await Promise.all(frames().map(frame => frame.executeJavaScript('window.fixtureReady === true')))).every(Boolean), 'game bootstrap');
    let [a, b] = frames();
    const origins = frames().map(frame => new URL(frame.url).host);
    assert.notEqual(origins[0], origins[1]);
    assert.ok(origins.every(host => host.startsWith('game-')));
    for (const [frame, id, hex, other] of [[a, 'a', '01020304', 'b'], [b, 'b', '05060708', 'a']]) {
      const state = await frame.executeJavaScript(`(() => {
        let parentBlocked = false;
        try { parent.localStorage.getItem('gameTokens'); } catch { parentBlocked = true; }
        return {id:localStorage.getItem('current_bin_id'),hex:localStorage.getItem('bin_data_${id}'),other:localStorage.getItem('bin_data_${other}'),
          tokens:localStorage.getItem('gameTokens'),secret:localStorage.getItem('isolation-secret'), parentBlocked,
          node:typeof require,bridge:typeof desktop,list:JSON.parse(localStorage.getItem('bin_file_list')).map(item=>item.id),
          persistedBin:Object.keys(localStorage).some(key=>key.startsWith('bin_data_'))};
      })()`);
      assert.deepEqual(state, { id, hex, other: null, tokens: null, secret: null, parentBlocked: true, node: 'undefined', bridge: 'undefined', list: [id], persistedBin: false });
    }
    console.log('PASS: separate origins, own BIN only, helper storage/Node/preload denied, BIN remains in memory');
    assert.deepEqual(errors, [], 'helper and game bootstrap must not trigger CSP/runtime errors');

    // 在攻击窗口中伪造另一个账号的 bootstrap 请求，不能收到该账号的资料。
    assert.equal(await a.executeJavaScript(`new Promise(resolve => {
      let received = false;
      const handler = event => { if (event.data?.type === 'game-bootstrap-init') received = true; };
      addEventListener('message', handler);
      parent.postMessage({source:'xyzw-embedded-game',type:'game-bootstrap-ready',binId:'b'},'xyzw://app');
      setTimeout(()=>{removeEventListener('message',handler);resolve(received)},200);
    })`), false);
    assert.equal(await a.executeJavaScript(`fetch('xyzw://app/index.html').then(()=>false,()=>true)`), true);
    assert.equal(await a.executeJavaScript(`fetch('xyzw://${origins[1]}/game/bootstrap.js').then(()=>false,()=>true)`), true);
    assert.equal(await js(`fetch('/game/index.html').then(r=>r.status)`), 404);
    assert.equal(await js(`fetch('//app/%2fgame/index.html').then(r=>r.status)`), 404);
    const helperFrame = await js(`new Promise(resolve=>{
      const f=document.createElement('iframe');f.src='xyzw://app/tokens';document.body.append(f);
      setTimeout(()=>{let loaded=false;try{loaded=Boolean(f.contentDocument?.querySelector('#app'))}catch{}f.remove();resolve(loaded)},200);
    })`);
    assert.equal(helperFrame, false);
    console.log('PASS: forged account messages, cross-origin fetches, helper-in-frame and same-origin game aliases blocked');

    await js(`document.querySelector('button[title="同步操作"]')?.click()`);
    // 当前按钮使用可访问文本，在标题不存在时按文本定位。
    await js(`(() => { const button=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='同步操作'); if(button && !button.classList.contains('toolbar-button-active')) button.click(); })()`);
    await until(() => a.executeJavaScript('true'), 'sync controls');
    await pause(150);
    const scrollBefore = await js('({grid:document.querySelector(".game-grid").scrollTop,page:document.scrollingElement.scrollTop})');
    await a.executeJavaScript(`(() => {const c=document.getElementById('GameCanvas'),r=c.getBoundingClientRect();for(const type of ['mousedown','mouseup'])c.dispatchEvent(new MouseEvent(type,{bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2,button:0}));})()`);
    await until(() => b.executeJavaScript('window.fixtureInputs.includes("mouseup")'), 'mouse sync');
    assert.deepEqual(await js('({grid:document.querySelector(".game-grid").scrollTop,page:document.scrollingElement.scrollTop})'), scrollBefore);
    await a.executeJavaScript(`(() => {const c=document.getElementById('GameCanvas'),r=c.getBoundingClientRect();for(const type of ['touchstart','touchend']){const t=new Touch({identifier:1,target:c,clientX:r.left+20,clientY:r.top+20});c.dispatchEvent(new TouchEvent(type,{bubbles:true,changedTouches:[t],touches:type==='touchend'?[]:[t],targetTouches:type==='touchend'?[]:[t]}));}})()`);
    await until(() => b.executeJavaScript('window.fixtureInputs.includes("touchend")'), 'touch sync');
    console.log('PASS: mouse and touch sync across isolated windows without outer scrolling');

    await a.executeJavaScript('location.reload()');
    await until(async () => {
      const next = frames().find(frame => new URL(frame.url).host === origins[0]);
      try { return next && await next.executeJavaScript('window.fixtureReady === true'); } catch { return false; }
    }, 'game reload');
    a = frames().find(frame => new URL(frame.url).host === origins[0]);
    assert.equal(await a.executeJavaScript('localStorage.getItem("bin_data_a")'), '01020304');
    assert.equal(await a.executeJavaScript('window.__binHex'), '01020304', 'the actual BIN loader consumes the isolated data');
    const firstUrl = a.url;
    await js(`document.querySelector('button[aria-label="关闭测试甲"]').click()`);
    await until(() => js('document.querySelectorAll(".game-iframe").length === 1'), 'close game');
    await until(async () => (await session.defaultSession.fetch(firstUrl)).status === 403, 'session revoked');
    assert.equal(await js('localStorage.getItem("isolation-secret")'), 'helper-only');
    console.log('PASS: reload restores only bound BIN; closing revokes origin and preserves helper data');

    await win.loadURL('xyzw://app/about');
    await until(() => js('document.querySelector(".about-page")?.textContent.includes("w1249178256 / xyzw_web_helper")'), 'about route');
    assert.equal(await js('document.querySelectorAll(".about-page a").length'), 1);
    await js(`document.querySelector('.about-page a').click()`);
    await until(() => opened.length === 1, 'about link');
    assert.equal(opened[0], 'https://github.com/w1249178256/xyzw_web_helper');
    assert.equal(await js(`window.desktop.openAboutLink('file:///tmp/test').then(()=>false,()=>true)`), true);
    await js('document.querySelector(".sidebar-toggle").click()');
    assert.equal(await js('Boolean(document.querySelector(".app-sider a[aria-label=关于]"))'), true);
    await js('document.querySelector(".sidebar-toggle").click()');
    fs.writeFileSync(path.join(process.env.XYZW_SMOKE_USER_DATA, 'about.png'), (await win.webContents.capturePage()).toPNG());
    useGameFixture = false;
    await win.loadURL('xyzw://app/game?bin_id=a');
    await until(async () => {
      const frame = frames()[0];
      try { return frame && await frame.executeJavaScript('window.HtmlIsLoaded === true && typeof window.boot === "function" && Boolean(window.cc)'); } catch { return false; }
    }, 'unmodified local game runtime');
    assert.equal(await frames()[0].executeJavaScript('window.__binHex'), '01020304');
    console.log('PASS: all original local game scripts load under the isolated game CSP (external requests blocked)');
    const snowflake = await frames()[0].executeJavaScript(`(() => {
      const button = document.getElementById('script-tool-toggle');
      const rect = button.getBoundingClientRect();
      const before = localStorage.getItem('scriptToolPosition');
      for (const type of ['mousedown', 'mouseup']) button.dispatchEvent(new MouseEvent(type, {
        bubbles: true, cancelable: true, button: 0, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2,
      }));
      return { opened: document.getElementById('script-tool-panel').classList.contains('show'),
        expanded: button.getAttribute('aria-expanded'), positionUnchanged: before === localStorage.getItem('scriptToolPosition') };
    })()`);
    assert.deepEqual(snowflake, { opened: true, expanded: 'true', positionUnchanged: true });
    console.log('PASS: first snowflake click opens the panel inside the isolated game without moving its icon');
    // 攻击探测产生的 CSP/导航错误是预期结果；助手启动和游戏加载阶段不得出现 CSP 拒绝。
    console.log(JSON.stringify({ result:'PASS', evidence:process.env.XYZW_SMOKE_USER_DATA, consoleErrors:errors.length }));
    clearTimeout(timeout); app.exit(0);
  } catch (error) { console.error(error); clearTimeout(timeout); app.exit(1); }
});
