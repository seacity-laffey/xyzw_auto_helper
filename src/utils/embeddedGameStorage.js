function decodeHexBuffer(hex) {
  if (typeof hex !== "string" || hex.length === 0 || hex.length % 2 !== 0)
    return null;
  if (!/^[0-9a-f]+$/i.test(hex))
    return null;

  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes.buffer;
}

export function findPreparedEmbeddedGameBin(token, storage, identifyBuffer) {
  if (!storage)
    return null;

  const candidateIds = [String(token.id)];
  let entries = [];
  try {
    const parsedEntries = JSON.parse(storage.getItem("bin_file_list") || "[]");
    entries = Array.isArray(parsedEntries) ? parsedEntries : [];
    const match = Array.isArray(entries)
      ? entries.find((entry) =>
          entry?.id === token.id
          || (token.name && entry?.name === token.name))
      : null;
    if (match?.id)
      candidateIds.push(String(match.id));
  } catch {
    // Direct token-id lookup still works when the optional list is corrupt.
  }

  for (const id of new Set(candidateIds)) {
    const buffer = decodeHexBuffer(storage.getItem(`bin_data_${id}`));
    if (buffer)
      return buffer;
  }

  if (identifyBuffer) {
    for (const entry of entries) {
      const buffer = decodeHexBuffer(storage.getItem(`bin_data_${entry?.id}`));
      if (buffer && identifyBuffer(buffer) === token.id)
        return buffer;
    }
  }
  return null;
}

export async function resolveEmbeddedGameBinData(
  token,
  getArrayBuffer,
  options = {},
) {
  const {
    storage = globalThis.localStorage,
    identifyBuffer,
  } = options;
  const keys = [token.id];
  if (token.name && token.name !== token.id)
    keys.push(token.name);

  for (const key of keys) {
    const buffer = await getArrayBuffer(key);
    if (buffer)
      return buffer;
  }

  return findPreparedEmbeddedGameBin(token, storage, identifyBuffer);
}
