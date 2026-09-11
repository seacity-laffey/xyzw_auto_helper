const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
app.setAppPath(path.resolve(__dirname, '..'));
process.env.XYZW_SMOKE_USER_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'xyzw-qr-'));
require('../desktop/main.cjs');
const timeout = setTimeout(() => { console.error('QR test timeout'); app.exit(1); }, 40000);
app.whenReady().then(async () => {
  try {
    const win = BrowserWindow.getAllWindows()[0];
    await new Promise(resolve => win.webContents.once('did-finish-load', resolve));
    const evaluate = code => win.webContents.executeJavaScript(code);
    const until = async (code) => {
      for (let attempt = 0; attempt < 200; attempt++) {
        if (await evaluate(code)) return;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error('QR UI condition timed out');
    };
    await until('Boolean(document.querySelector("#app")?.__vue_app__)');
    await evaluate('document.querySelector("#app").__vue_app__.config.globalProperties.$router.push("/tokens")');
    await until('[...document.querySelectorAll("button")].some(b => b.textContent.includes("添加 Token"))');
    await evaluate('[...document.querySelectorAll("button")].find(b => b.textContent.includes("添加 Token")).click()');
    await until('[...document.querySelectorAll("button")].some(b => b.textContent.trim() === "微信扫码")');
    await evaluate('[...document.querySelectorAll("button")].find(b => b.textContent.trim() === "微信扫码").click()');
    await until('Boolean(document.querySelector("#qr-placeholder"))');
    await evaluate('document.querySelector("#qr-placeholder").click()');
    await until('Boolean(document.querySelector("#qr-image")?.naturalWidth) || document.querySelector("#qr-status")?.classList.contains("error")');
    const result = await evaluate('({status:document.querySelector("#qr-status").textContent.trim(), imageLoaded:document.querySelector("#qr-image")?.naturalWidth > 0})');
    console.log(JSON.stringify(result));
    clearTimeout(timeout); app.exit(result.imageLoaded ? 0 : 1);
  } catch(e) { console.error(e); clearTimeout(timeout); app.exit(1); }
});
