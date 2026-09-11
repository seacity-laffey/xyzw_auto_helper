const { contextBridge, ipcRenderer } = require('electron');
if (process.isMainFrame && location.protocol === 'xyzw:' && location.host === 'app') {
  contextBridge.exposeInMainWorld('desktop', Object.freeze({
    isDesktop: true,
    isGameWindow: process.argv.includes('--xyzw-game-window'),
    createGameSession: tokenId => ipcRenderer.invoke('game-session:create', tokenId),
    releaseGameSession: origin => ipcRenderer.invoke('game-session:release', origin),
    openAboutLink: url => ipcRenderer.invoke('about:open-link', url),
  }));
}
