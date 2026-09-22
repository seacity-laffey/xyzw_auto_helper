// 使用实际 Vue 组件和 html2canvas，验证 30 人表格导出及阵容布局。
const { app, BrowserWindow, nativeImage, session } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'xyzw-peach-export-'));
app.setPath('userData', temp);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn) {
  for (let i = 0; i < 300; i++) { if (await fn()) return; await pause(100); }
  throw new Error('Peach export condition timed out');
}
const timeout = setTimeout(() => { console.error('Peach export timed out'); app.exit(1); }, 90000);
let server;
app.whenReady().then(async () => {
  try {
    const { createServer } = await import('vite');
    server = await createServer({ mode: 'desktop', server: { host: '127.0.0.1', port: 0 }, plugins: [{
      name: 'peach-export-fixture', configureServer(vite) {
        vite.middlewares.use('/__peach_export', async (_req, res) => {
          const html = await vite.transformIndexHtml('/__peach_export', `<html><head><style>body{margin:0}#fixture{height:800px}</style></head><body><div id="fixture"></div><script type="module">
            import {createApp, h} from 'vue';
            import {createPinia} from 'pinia';
            import {NMessageProvider, NDialogProvider} from 'naive-ui';
            import Peach from '/src/components/Club/PeachInfoV2.vue';
            createApp({render:()=>h(NMessageProvider,null,{default:()=>h(NDialogProvider,null,{default:()=>h(Peach,{ref:vm=>window.peach=vm})})})}).use(createPinia()).mount('#fixture');
          </script></body></html>`);
          res.setHeader('Content-Type', 'text/html'); res.end(html);
        });
      }
    }] });
    await server.listen();
    const port = server.httpServer.address().port;
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => callback({ cancel: /^https?:/.test(details.url) && !details.url.startsWith(`http://127.0.0.1:${port}/`) }));
    const win = new BrowserWindow({ width: 1500, height: 900, webPreferences: { nodeIntegration: false, contextIsolation: true } });
    const js = code => win.webContents.executeJavaScript(code);
    win.webContents.on('console-message', e => { if (e.level === 'error') console.error(e.message); });
    await win.loadURL(`http://127.0.0.1:${port}/__peach_export`);
    await until(() => js('Boolean(window.peach)'));
    await js(`(() => {
      const state = window.peach.$.setupState;
      state.queryDate = '2026/09/13';
      const club = {id:1, name:'测试俱乐部', serverId:3111, memberCount:30, enrolledCount:30, quenchNum:1200, power:123456789, announcement:'测试公告'};
      state.battleInfo = {ownClub:club, opponentClub:{...club,id:2}};
      state.opponentMembers = Array.from({length:30}, (_,i) => ({id:1000+i, roleId:1000+i, name:'测试成员'+(i+1), power:123456789, quenchNum:67, lineupType:'吴国', heroList:Array.from({length:5}, (_,j)=>({heroName:['大乔','鲁肃','孙策','太史慈','周瑜'][j],red:15+j,HolyBeast:true,HBlevel:10+j,PearlInfo:{FishInfo:{name:'公孙心'},PearlSkill:{name:'碎盾同心'}}}))}));
    })()`);
    await until(() => js('document.querySelectorAll(".n-data-table-tbody tr").length === 30'));
    const overlaps = () => js(`(() => {
      for (const list of document.querySelectorAll('.lineup-card-list')) {
        const cards = [...list.children].map(el=>el.getBoundingClientRect());
        for (let i=0;i<cards.length;i++) for(let j=i+1;j<cards.length;j++) {
          if (Math.min(cards[i].right,cards[j].right)>Math.max(cards[i].left,cards[j].left)+1 && Math.min(cards[i].bottom,cards[j].bottom)>Math.max(cards[i].top,cards[j].top)+1) return true;
        }
        for (const row of list.querySelectorAll('.lineup-card-row-stats')) {
          if (row.children[0].getBoundingClientRect().right > row.children[1].getBoundingClientRect().left) return true;
        }
      }
      return false;
    })()`);
    assert.equal(await overlaps(), false, 'lineup cards and red/holy labels must not overlap');
    let saved;
    session.defaultSession.on('will-download', (_event, item) => {
      item.setSavePath(path.join(temp, item.getFilename()));
      item.once('done', (_event, state) => { assert.equal(state,'completed'); saved=item.getSavePath(); });
    });
    // 在截图之前检测导出模式下最后一行确实位于画布范围内。
    await js(`window.exportGeometry = new Promise(resolve => {
      const observer = new MutationObserver(() => {
        if (!document.querySelector('.exporting-matchup')) return;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const root = document.querySelector('.peach-info-card').getBoundingClientRect();
          const rows = [...document.querySelectorAll('.n-data-table-tbody tr')];
          const last = rows.at(-1).getBoundingClientRect();
          resolve({count:rows.length, rootHeight:root.height, lastHeight:last.height, contained:last.bottom<=root.bottom+1});
        })); observer.disconnect();
      }); observer.observe(document.body,{attributes:true,subtree:true});
    }); window.peach.$.setupState.handleExportImage();`);
    const geometry = await js('window.exportGeometry');
    assert.equal(geometry.count,30); assert.ok(geometry.lastHeight > 20); assert.ok(geometry.contained);
    await until(() => saved);
    const size = nativeImage.createFromPath(saved).getSize();
    assert.ok(size.height >= geometry.rootHeight * 2 - 2);
    assert.ok(size.height > 3000, 'export must contain the body, not only the header');
    assert.equal(await js('Boolean(document.querySelector(".exporting-matchup"))'),false);
    assert.equal(await overlaps(),false);
    console.log(JSON.stringify({result:'PASS',geometry,size,image:saved}));
    await server.close(); clearTimeout(timeout); app.exit(0);
  } catch (error) { console.error(error); await server?.close(); clearTimeout(timeout); app.exit(1); }
});
