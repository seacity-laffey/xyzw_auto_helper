import { timingSafeEqual } from 'node:crypto';

/** 所有 API 共用鉴权；未配置密钥时默认拒绝，健康检查不挂此中间件。 */
export function requireApiKey(req, res, next) {
  const expected = process.env.API_KEY;
  const provided = req.header('x-api-key') || req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!expected || typeof provided !== 'string') return res.status(401).json({ error: 'Unauthorized' });
  const actualBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return res.status(401).json({ error: 'Unauthorized' });
  next();
}
