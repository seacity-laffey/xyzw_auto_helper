const { contextBridge, ipcRenderer } = require('electron');
if (process.isMainFrame && location.protocol === 'xyzw:' && location.host === 'app') {
  contextBridge.exposeInMainWorld('desktop', Object.freeze({
    isDesktop: true,
    isGameWindow: process.argv.includes('--xyzw-game-window'),
    createGameSession: (tokenId, confirmedOrigin) => ipcRenderer.invoke('game-session:create', tokenId, confirmedOrigin),
    listGameAccounts: () => ipcRenderer.invoke('game-session:list'),
    onGameDetach: callback => {
      const handler = async (_event, account) => {
        try {
          await callback(account);
          ipcRenderer.send('game-session:detached', account.origin);
        } catch { /* 原窗口未能移除时不确认，主进程终止转移。 */ }
      };
      ipcRenderer.on('game-session:detach', handler);
      return () => ipcRenderer.removeListener('game-session:detach', handler);
    },
    releaseGameSession: origin => ipcRenderer.invoke('game-session:release', origin),
    openAboutLink: url => ipcRenderer.invoke('about:open-link', url),
  }));
}
