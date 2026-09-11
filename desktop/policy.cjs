const path = require('node:path');
const ORIGIN = 'xyzw://app';
const routes = new Set(['/', '/index.html', '/tokens', '/role', '/batch-tasks', '/pushing-levels', '/game', '/about', '/admin', '/login', '/register', '/game-roles']);
function isLocal(url) {
  try { const u = new URL(url); return u.protocol === 'xyzw:' && u.hostname === 'app' && !u.port && !u.username && !u.password; } catch { return false; }
}
function isGame(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'xyzw:' && /^game-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(u.hostname)
      && !u.port && !u.username && !u.password;
  } catch { return false; }
}
function assetPath(url, root) {
  if (!isLocal(url) && !isGame(url)) return null;
  let pathname;
  try { pathname = decodeURIComponent(new URL(url).pathname); } catch { return null; }
  if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').includes('..')) return null;
  // Windows 会忽略路径段末尾的点和空格，并允许 NTFS 数据流；拒绝这些别名。
  if (pathname.split('/').some(segment => /[. ]$/.test(segment) || /[<>:"|?*]/.test(segment))) return null;
  pathname = path.posix.normalize(pathname);
  if (isGame(url) ? !pathname.toLowerCase().startsWith('/game/') : pathname.toLowerCase().startsWith('/game/')) return null;
  if (routes.has(pathname) || pathname.startsWith('/admin/')) pathname = '/index.html';
  if (pathname.startsWith('/api/') || pathname === '/_worker.js') return null;
  const resolved = path.resolve(root, `.${pathname}`);
  return resolved.startsWith(`${path.resolve(root)}${path.sep}`) ? resolved : null;
}
const externalLinks = new Set([
  'https://github.com/w1249178256/xyzw_web_helper',
  'https://github.com/seacity-laffey/xyzw_auto_helper',
  'https://creativecommons.org/licenses/by-nc-sa/4.0/',
]);
function isAllowedExternal(url) { return externalLinks.has(url); }
function contentSecurityPolicy(game) {
  const common = "object-src 'none'; base-uri 'none'; form-action 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; font-src 'self' https: data:; media-src 'self' https: blob: data:; worker-src 'self' blob:";
  return game
    // 游戏引擎会解码脚本并执行，游戏内脚本工具也会创建内联脚本；这些权限仅给独立游戏来源。
    ? `default-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://xxz-xyzw-res.hortorgames.com; connect-src 'self' https: wss:; frame-src 'none'; frame-ancestors ${ORIGIN}; ${common}`
    : `default-src 'none'; script-src 'self'; connect-src 'self' https: wss:; frame-src xyzw:; frame-ancestors 'none'; ${common}`;
}
function loginTarget(url, method) {
  if (!isLocal(url)) return null;
  const u = new URL(url);
  const endpoints = {
    '/api/weixin/connect/app/qrconnect': ['GET', 'https://open.weixin.qq.com/connect/app/qrconnect'],
    '/api/weixin/connect/l/qrconnect': ['GET', 'https://open.weixin.qq.com/connect/l/qrconnect'],
    '/api/weixin-long/connect/l/qrconnect': ['GET', 'https://long.open.weixin.qq.com/connect/l/qrconnect'],
    '/api/hortor/comb-login-server/api/v1/login': ['POST', 'https://comb-platform.hortorgames.com/comb-login-server/api/v1/login'],
    '/api/game-login/authuser': ['POST', 'https://xxz-xyzw.hortorgames.com/login/authuser'],
    '/api/game-login/serverlist': ['POST', 'https://xxz-xyzw.hortorgames.com/login/serverlist'],
  };
  const endpoint = endpoints[u.pathname];
  return endpoint && endpoint[0] === method ? endpoint[1] + u.search : null;
}
function loginHeaders(target, accept, contentType) {
  const weixin = new URL(target).hostname.endsWith('.weixin.qq.com');
  const headers = {
    Accept: accept || '*/*',
    'Content-Type': contentType || 'text/plain',
  };
  if (weixin) {
    headers['User-Agent'] = 'Mozilla/5.0 (Linux; Android 7.0; Mi-4c Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/53.0.2785.49 Mobile MQQBrowser/6.2 TBS/043632 Safari/537.36 MicroMessenger/6.6.1.1220(0x26060135) NetType/WIFI Language/zh_CN';
    headers.Referer = 'https://open.weixin.qq.com/';
  } else if (new URL(target).hostname === 'comb-platform.hortorgames.com') {
    headers['User-Agent'] = 'Mozilla/5.0 (Linux; Android 12; 23117RK66C Build/V417IR; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/95.0.4638.74 Mobile Safari/537.36';
    headers.Origin = 'https://open.weixin.qq.com';
    headers.Referer = 'https://open.weixin.qq.com/';
  }
  return headers;
}
module.exports = { ORIGIN, isLocal, isGame, assetPath, loginTarget, loginHeaders, contentSecurityPolicy, isAllowedExternal };
