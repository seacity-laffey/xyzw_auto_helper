const { randomUUID } = require('node:crypto');
const { isLocal, isGame } = require('./policy.cjs');

// 注册表只保存窗口归属，不接收或保存账号凭证。
function createGameSessions() {
  const sessions = new Map();
  function assertOwner(event) {
    if (!event.senderFrame || event.senderFrame !== event.sender.mainFrame || !isLocal(event.senderFrame.url)) {
      throw new Error('Forbidden');
    }
  }
  return {
    create(event, tokenId) {
      assertOwner(event);
      if (typeof tokenId !== 'string' || !tokenId || tokenId.length > 256) throw new Error('Invalid account');
      if ([...sessions.values()].filter(id => id === event.sender.id).length >= 100) throw new Error('Too many game windows');
      const origin = `xyzw://game-${randomUUID()}`;
      sessions.set(origin, event.sender.id);
      return { origin, url: `${origin}/game/index.html?bin_id=${encodeURIComponent(tokenId)}` };
    },
    has(url, ownerId) {
      if (!isGame(url)) return false;
      const owner = sessions.get(`xyzw://${new URL(url).host}`);
      return owner !== undefined && (ownerId === undefined || owner === ownerId);
    },
    release(event, origin) {
      assertOwner(event);
      if (sessions.get(origin) !== event.sender.id) return false;
      return sessions.delete(origin);
    },
    releaseOwner(ownerId) {
      const origins = [];
      for (const [origin, owner] of sessions) {
        if (owner === ownerId) { sessions.delete(origin); origins.push(origin); }
      }
      return origins;
    },
  };
}
module.exports = { createGameSessions };
