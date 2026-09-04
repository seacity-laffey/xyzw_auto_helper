export function normalizeEmbeddedGameIds(value, fallbackId = "") {
  const values = Array.isArray(value) ? value : [value];
  const ids = values
    .flatMap((item) => (typeof item === "string" ? item.split(",") : []))
    .map((item) => item.trim())
    .filter(Boolean);

  if (ids.length === 0 && fallbackId) {
    ids.push(String(fallbackId));
  }

  return [...new Set(ids)];
}

export function buildEmbeddedGameSource(baseUrl, tokenId) {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}game/index.html?bin_id=${encodeURIComponent(tokenId)}`;
}

export function buildEmbeddedGameLocation(tokenIds, from) {
  return {
    path: "/game",
    query: {
      bin_id: normalizeEmbeddedGameIds(tokenIds),
      ...(from ? { from } : {}),
    },
  };
}
