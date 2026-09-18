const fs = require('node:fs/promises');
const path = require('node:path');

module.exports = {
  packagerConfig: {
    name: 'XYZWHelper', executableName: 'XYZWHelper', asar: true,
    appBundleId: 'com.xyzw.helper', appCopyright: 'XYZW Team',
    icon: path.join(__dirname, 'desktop/assets/icon'),
    // 主进程只使用 Electron / Node 内置模块；Vue 依赖已由 Vite 打包。
    ignore: file => file !== '' && !/^\/(dist(?:\/|$)|desktop(?:$|\/(?:(?:main|preload|policy|game-sessions)\.cjs$|assets(?:$|\/icon\.(?:ico|icns)$)))|package\.json$|LICENSE$|NOTICE\.txt$|THIRD_PARTY_NOTICES\.txt$)/.test(file),
    extraResource: ['LICENSE', 'NOTICE.txt', 'THIRD_PARTY_NOTICES.txt'],
    prune: false,
  },
  makers: [{ name: '@electron-forge/maker-zip', platforms: ['win32', 'darwin'] }],
  hooks: {
    postMake: async (_config, results) => {
      for (const result of results) {
        for (let index = 0; index < result.artifacts.length; index++) {
          const artifact = result.artifacts[index];
          if (path.extname(artifact).toLowerCase() !== '.zip') continue;
          const output = path.join(path.dirname(artifact), 'xyzw.zip');
          if (artifact !== output) await fs.rename(artifact, output);
          result.artifacts[index] = output;
        }
      }
      return results;
    },
  },
};
