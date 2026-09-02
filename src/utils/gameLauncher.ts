import lz4 from "lz4js";

export interface EmbeddedGameToken {
  id: string;
  name?: string;
}

function extractKey(bytes: Uint8Array) {
  return (
    (((bytes[2] >> 6) & 1) << 7)
    | (((bytes[2] >> 4) & 1) << 6)
    | (((bytes[2] >> 2) & 1) << 5)
    | ((bytes[2] & 1) << 4)
    | (((bytes[3] >> 6) & 1) << 3)
    | (((bytes[3] >> 4) & 1) << 2)
    | (((bytes[3] >> 2) & 1) << 1)
    | (bytes[3] & 1)
  );
}

function encodeKey(bytes: Uint8Array, key: number) {
  bytes[2]
    = (bytes[2] & 0b10101010)
      | (((key >> 7) & 1) << 6)
      | (((key >> 6) & 1) << 4)
      | (((key >> 5) & 1) << 2)
      | ((key >> 4) & 1);
  bytes[3]
    = (bytes[3] & 0b10101010)
      | (((key >> 3) & 1) << 6)
      | (((key >> 2) & 1) << 4)
      | (((key >> 1) & 1) << 2)
      | (key & 1);
}

function decryptX(bytes: Uint8Array) {
  const key = extractKey(bytes);
  const output = new Uint8Array(bytes);
  for (let index = output.length; --index >= 4;) {
    output[index] ^= key;
  }
  return output.subarray(4);
}

function encryptLx(plain: Uint8Array) {
  const compressed = lz4.compress(plain);
  const output = new Uint8Array(compressed.length);
  output.set(compressed);
  const key = 2 + Math.floor(Math.random() * 248);
  for (let index = Math.min(output.length, 100); --index >= 0;) {
    output[index] ^= key;
  }
  output[0] = 112;
  output[1] = 108;
  encodeKey(output, key);
  return output;
}

export function convertGameBinToLx(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length <= 4 || bytes[0] !== 112) {
    return bytes;
  }
  if (bytes[1] === 108) {
    return bytes;
  }
  return bytes[1] === 120 ? encryptLx(decryptX(bytes)) : bytes;
}

export function prepareEmbeddedGameSession(
  token: EmbeddedGameToken,
  binData: ArrayBuffer,
) {
  const converted = convertGameBinToLx(binData);
  const hex = Array.from(converted, (byte) =>
    byte.toString(16).padStart(2, "0")).join("");

  localStorage.setItem(`bin_data_${token.id}`, hex);
  localStorage.setItem("current_bin_id", token.id);

  let binList: Array<Record<string, unknown>> = [];
  try {
    binList = JSON.parse(localStorage.getItem("bin_file_list") || "[]");
  } catch {
    binList = [];
  }

  if (!binList.some((item) => item.id === token.id)) {
    binList.push({
      id: token.id,
      name: token.name || "Token",
      byteLength: binData.byteLength,
      size: `${(binData.byteLength / 1024).toFixed(1)} KB`,
      order: binList.length,
    });
    localStorage.setItem("bin_file_list", JSON.stringify(binList));
  }
}
