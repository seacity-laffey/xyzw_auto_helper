module.exports = {
  packagerConfig: {
    name: 'XYZWHelper', executableName: 'XYZWHelper', asar: true,
    appBundleId: 'com.xyzw.helper', appCopyright: 'XYZW Team',
    // 主进程只使用 Electron / Node 内置模块；Vue 依赖已由 Vite 打包。
    ignore: file => file !== '' && !/^\/(dist(?:\/|$)|desktop(?:$|\/(?:main|preload|policy|game-sessions)\.cjs$)|package\.json$|LICENSE$|NOTICE\.txt$|THIRD_PARTY_NOTICES\.txt$)/.test(file),
    extraResource: ['LICENSE', 'NOTICE.txt', 'THIRD_PARTY_NOTICES.txt'],
    prune: false,
  },
  makers: [{ name: '@electron-forge/maker-zip', platforms: ['win32', 'darwin'] }],
};
