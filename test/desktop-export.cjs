// 临时数据与本地 Canvas 验证真实下载落盘，不访问账号或游戏服务。
const { app, BrowserWindow, dialog, nativeImage, session, shell } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'xyzw-export-'));
process.env.XYZW_SMOKE_USER_DATA = temp;
app.setAppPath(root);
const notices = [], revealed = [];
dialog.showMessageBox = async options => { notices.push(options); return { response: 0 }; };
shell.showItemInFolder = filename => revealed.push(filename);
require('../desktop/main.cjs');
const timeout = setTimeout(() => { console.error('Export test timed out'); app.exit(1); }, 45000);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn) {
  for (let i = 0; i < 100; i++) { if (await fn()) return; await pause(100); }
  throw new Error('Export condition timed out');
}
app.whenReady().then(async () => {
  try {
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => callback({ cancel: /^https?:|^wss?:/.test(details.url) }));
    await until(() => BrowserWindow.getAllWindows().length);
    const win = BrowserWindow.getAllWindows()[0];
    const js = code => win.webContents.executeJavaScript(code);
    await until(() => js('Boolean(document.querySelector(".app-sider"))'));
    let cancel = false;
    session.defaultSession.on('will-download', (_event, item) => {
      assert.equal(item.getSaveDialogOptions().defaultPath, path.join(app.getPath('downloads'), item.getFilename()));
      if (cancel) item.cancel();
      else item.setSavePath(path.join(temp, item.getFilename()));
    });
    const source = ts.transpile(fs.readFileSync(path.join(root, 'src/utils/imageExport.ts'), 'utf8'), { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS });
    await js(`window.exports = {}; ${source}; window.exportFixture = () => {
      const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 80;
      const context = canvas.getContext('2d'); context.fillStyle = '#ff0000'; context.fillRect(0, 0, 160, 80);
      window.exports.downloadCanvasAsImage(canvas, '导出验证.png');
    }; window.exportFixture();`);
    const saved = path.join(temp, '导出验证.png');
    await until(() => revealed.includes(saved));
    assert.equal(notices.length, 1);
    assert.equal(notices[0].detail, saved);
    const bytes = fs.readFileSync(saved);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    const image = nativeImage.createFromPath(saved);
    assert.deepEqual(image.getSize(), { width: 160, height: 80 });
    assert.deepEqual([...image.toBitmap().subarray(0, 4)], [0, 0, 255, 255]);
    cancel = true;
    await js('window.exportFixture()');
    await pause(700);
    assert.equal(notices.length, 1, 'cancel must not show a saved-file notification');
    console.log('PASS: real Canvas PNG saved with correct size and pixels; completion shows exact path and reveals file; cancelled download has no success dialog');
    clearTimeout(timeout); app.exit(0);
  } catch (error) { console.error(error); clearTimeout(timeout); app.exit(1); }
});
