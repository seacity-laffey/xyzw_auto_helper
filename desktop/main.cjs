const { app, BrowserWindow, Menu, protocol, net, session, dialog, powerMonitor, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { ORIGIN, isLocal, isGame, assetPath, loginTarget, loginHeaders, contentSecurityPolicy, isAllowedExternal } = require('./policy.cjs');
const { createGameSessions } = require('./game-sessions.cjs');
const gameSessions = createGameSessions();

app.setName('XYZW Helper');
app.setPath('userData', !app.isPackaged && process.env.XYZW_SMOKE_USER_DATA
  ? process.env.XYZW_SMOKE_USER_DATA : path.join(app.getPath('appData'), 'XYZWHelper'));
app.setAppUserModelId('com.xyzw.helper');
protocol.registerSchemesAsPrivileged([{ scheme: 'xyzw', privileges: {
  standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true,
} }]);
let mainWindow;
function clearGameStorage(origin) {
  return session.defaultSession.clearStorageData({ origin }).catch(() => {});
}
function log(event, data = {}) {
  // 不记录请求、Token、游戏消息或页面控制台，避免凭证落盘。
  const file = path.join(app.getPath('userData'), 'desktop.log');
  try {
    if (fs.existsSync(file) && fs.statSync(file).size > 2 * 1024 * 1024) fs.renameSync(file, `${file}.previous`);
    fs.appendFileSync(file, `${JSON.stringify({ time: new Date().toISOString(), event, ...data })}\n`);
  } catch { /* 日志失败不影响游戏 */ }
}
function createWindow(url = `${ORIGIN}/`, game = false) {
  const win = new BrowserWindow({
    title: 'XYZW 游戏助手', width: 1440, height: 960, minWidth: 900, minHeight: 600,
    show: false, backgroundColor: '#f5f5f5',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false,
      contextIsolation: true, sandbox: true, webSecurity: true,
      backgroundThrottling: false, webviewTag: false,
      additionalArguments: game ? ['--xyzw-game-window'] : [],
    },
  });
  const allowedNavigation = target => isLocal(target) && !new URL(target).pathname.startsWith('/game/');
  win.webContents.on('will-navigate', (event, target) => {
    if (!allowedNavigation(target)) event.preventDefault();
    else if (!game && new URL(target).pathname === '/migration.html') {
      for (const other of BrowserWindow.getAllWindows()) if (other !== win) other.close();
    }
  });
  win.webContents.on('will-redirect', (event, target) => { if (!allowedNavigation(target)) event.preventDefault(); });
  win.webContents.on('will-frame-navigate', event => {
    if (event.isMainFrame) return;
    const parent = event.frame?.parent;
    if (parent !== win.webContents.mainFrame || !gameSessions.has(event.url, win.webContents.id)
      || new URL(event.url).pathname !== '/game/index.html'
      || (event.initiator && event.initiator !== parent && event.initiator !== event.frame)) event.preventDefault();
    // 已加载的游戏只能在自己的来源中刷新，不能跳到其他账号的来源。
    else if (isGame(event.frame.url) && new URL(event.frame.url).host !== new URL(event.url).host) event.preventDefault();
  });
  const ownerId = win.webContents.id;
  const releaseGames = () => gameSessions.releaseOwner(ownerId).forEach(clearGameStorage);
  win.webContents.on('destroyed', releaseGames);
  win.webContents.on('did-start-navigation', (_event, _url, sameDocument, isMainFrame) => {
    if (isMainFrame && !sameDocument) releaseGames();
  });
  win.webContents.setWindowOpenHandler(({ url: target }) => {
    if (isLocal(target) && new URL(target).pathname === '/game') createWindow(target, true);
    return { action: 'deny' };
  });
  win.webContents.on('will-attach-webview', event => event.preventDefault());
  win.webContents.on('render-process-gone', (_event, details) => {
    log('renderer-gone', { reason: details.reason, exitCode: details.exitCode });
    dialog.showErrorBox('页面进程已停止', '任务已停止。请重新启动应用；错过的定时任务不会补跑。');
  });
  win.webContents.on('did-fail-load', (_event, code, _description, _url, isMainFrame) => {
    if (isMainFrame) log('load-failed', { code });
  });
  win.once('ready-to-show', () => win.show());
  win.loadURL(url);
  if (!game) {
    mainWindow = win;
    win.on('closed', () => app.quit());
  }
  return win;
}
async function handleRequest(request) {
  const game = isGame(request.url);
  if (!isLocal(request.url) && !(game && gameSessions.has(request.url))) return new Response('Forbidden', { status: 403 });
  const pathname = new URL(request.url).pathname;
  if (pathname.startsWith('/api/')) {
    const target = loginTarget(request.url, request.method);
    if (!target) return new Response('Not found', { status: 404 });
    try {
      const body = request.method === 'POST' ? await request.arrayBuffer() : undefined;
      if (body && body.byteLength > 1024 * 1024) return new Response('Too large', { status: 413 });
      const response = await net.fetch(target, {
        method: request.method, body, redirect: 'error', credentials: 'omit',
        signal: AbortSignal.timeout(20000),
        headers: loginHeaders(target, request.headers.get('accept'), request.headers.get('content-type')),
      });
      return new Response(response.body, { status: response.status, headers: {
        'Content-Type': response.headers.get('content-type') || 'text/plain', 'Cache-Control': 'no-store',
      } });
    } catch { return new Response('Login upstream unavailable', { status: 502 }); }
  }
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
  const filename = assetPath(request.url, path.join(app.getAppPath(), 'dist'));
  if (!filename) return new Response('Not found', { status: 404 });
  try {
    if (!fs.statSync(filename).isFile()) return new Response('Not found', { status: 404 });
    const response = await net.fetch(pathToFileURL(filename).href, { method: request.method });
    const headers = new Headers(response.headers);
    headers.set('Content-Security-Policy', contentSecurityPolicy(game));
    headers.set('Cross-Origin-Resource-Policy', 'same-origin');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'no-referrer');
    return new Response(response.body, { status: response.status, headers });
  } catch { return new Response('Not found', { status: 404 }); }
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.restore(); mainWindow.show(); mainWindow.focus(); }
  });
  app.whenReady().then(() => {
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    protocol.handle('xyzw', handleRequest);
    ipcMain.handle('game-session:create', (event, tokenId) => gameSessions.create(event, tokenId));
    ipcMain.handle('game-session:release', async (event, origin) => {
      if (gameSessions.release(event, origin)) await clearGameStorage(origin);
    });
    ipcMain.handle('about:open-link', async (event, url) => {
      if (event.senderFrame !== event.sender.mainFrame || !isLocal(event.senderFrame?.url) || !isAllowedExternal(url)) throw new Error('Forbidden');
      await shell.openExternal(url);
    });
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    session.defaultSession.on('will-download', (_event, item) => {
      item.setSaveDialogOptions({ title: '保存导出文件', defaultPath: path.basename(item.getFilename()) });
      item.once('done', (_event, state) => {
        log('download', { state });
        if (state !== 'completed' && state !== 'cancelled') dialog.showErrorBox('导出失败', '文件未保存，请重试。');
      });
    });
    Menu.setApplicationMenu(process.platform === 'win32' ? null : Menu.buildFromTemplate([
      { label: '应用', submenu: [
        { label: '最小化（任务继续运行）', click: () => mainWindow?.minimize() },
        { label: '运行状态', click: () => {
          const metrics = app.getAppMetrics().map(({ type, cpu, memory }) => ({ type, cpu, memory }));
          log('metrics', { metrics });
          dialog.showMessageBox({ message: `XYZW Helper ${app.getVersion()}`, detail: `Electron ${process.versions.electron}\n数据目录：${app.getPath('userData')}\n日志：desktop.log\n最小化继续运行；关闭主窗口退出。休眠及退出期间不执行任务。\n资源采样已写入日志。` });
        } },
        { type: 'separator' }, { label: '退出（停止任务）', role: 'quit' },
      ] },
      { label: '编辑', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
      { label: '视图', submenu: [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' }, { role: 'toggleDevTools' }] },
    ]));
    powerMonitor.on('suspend', () => log('suspend'));
    powerMonitor.on('resume', () => log('resume'));
    log('start', { version: app.getVersion(), electron: process.versions.electron, platform: process.platform, arch: process.arch });
    createWindow();
  }).catch(() => { dialog.showErrorBox('启动失败', '请确认应用目录完整且数据目录可写。'); app.quit(); });
}
app.on('window-all-closed', () => app.quit());
