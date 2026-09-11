const databases = {
  xyzw: { tokens: "id" },
  xyzw_token_db: { kv: "key", gameTokens: "roleId" },
};
export function encodeValue(value) {
  if (value instanceof ArrayBuffer) {
    let binary = "";
    for (const byte of new Uint8Array(value)) binary += String.fromCharCode(byte);
    return ["buffer", btoa(binary)];
  }
  if (value instanceof Date)
    return ["date", value.toISOString()];
  if (Array.isArray(value))
    return ["array", value.map(encodeValue)];
  if (value && typeof value === "object")
    return ["object", Object.entries(value).map(([k, v]) => [k, encodeValue(v)])];
  if (value === undefined)
    return ["undefined"];
  return ["value", value];
}
export function decodeValue(encoded, depth = 0) {
  if (depth > 100 || !Array.isArray(encoded))
    throw new Error("备份数据格式无效");
  const [type, value] = encoded;
  if (type === "buffer" && typeof value === "string")
    return Uint8Array.from(atob(value), (c) => c.charCodeAt(0)).buffer;
  if (type === "date" && typeof value === "string" && Number.isFinite(Date.parse(value)))
    return new Date(value);
  if (type === "array" && Array.isArray(value))
    return value.map((v) => decodeValue(v, depth + 1));
  if (type === "object" && Array.isArray(value)) {
    return Object.fromEntries(value.map(([k, v]) => {
      if (typeof k !== "string")
        throw new Error("备份字段无效");
      return [k, decodeValue(v, depth + 1)];
    }));
  }
  if (type === "undefined")
    return undefined;
  if (type === "value" && (value === null || ["string", "boolean", "number"].includes(typeof value)))
    return value;
  throw new Error("备份数据类型无效");
}
function openDatabase(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      for (const [store, keyPath] of Object.entries(databases[name])) {
        const objectStore = request.result.createObjectStore(store, { keyPath });
        if (name === "xyzw")
          objectStore.createIndex("by-created", "createdAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("请关闭其他游戏窗口或标签页后重试"));
  });
}
async function readDatabase(name) {
  const db = await openDatabase(name);
  try {
    return await new Promise((resolve, reject) => {
      const result = {};
      const tx = db.transaction(Object.keys(databases[name]), "readonly");
      for (const store of Object.keys(databases[name])) {
        const request = tx.objectStore(store).getAll();
        request.onsuccess = () => {
          result[store] = request.result;
        };
      }
      tx.oncomplete = () => resolve(result);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error("读取失败"));
    });
  } finally {
    db.close();
  }
}
async function writeDatabase(name, data, replace = false) {
  const db = await openDatabase(name);
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(Object.keys(databases[name]), "readwrite");
      tx.oncomplete = resolve;
      tx.onerror = tx.onabort = () => reject(tx.error || new Error("写入失败"));
      try {
        for (const [store, records] of Object.entries(data)) {
          const target = tx.objectStore(store);
          if (replace)
            target.clear();
          for (const record of records) target.put(record);
        }
      } catch (error) {
        tx.abort();
        reject(error);
      }
    });
  } finally {
    db.close();
  }
}
export async function createBackup() {
  const data = {};
  for (const name of Object.keys(databases)) data[name] = await readDatabase(name);
  return { format: "xyzw-backup", version: 1, createdAt: new Date().toISOString(), localStorage: Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])), databases: encodeValue(data) };
}
export function validateBackup(backup) {
  if (backup?.format !== "xyzw-backup" || backup.version !== 1 || !backup.localStorage || typeof backup.localStorage !== "object" || Array.isArray(backup.localStorage)
    || Object.values(backup.localStorage).some((v) => typeof v !== "string")) {
    throw new Error("不是受支持的完整备份文件");
  }
  const data = decodeValue(backup.databases);
  if (!data || Object.keys(data).length !== Object.keys(databases).length)
    throw new Error("备份缺少数据库");
  for (const [name, stores] of Object.entries(databases)) {
    if (!data[name] || Object.keys(data[name]).length !== Object.keys(stores).length)
      throw new Error("备份缺少数据表");
    for (const [store, key] of Object.entries(stores)) {
      if (!Array.isArray(data[name][store]) || data[name][store].some((r) => !r || typeof r[key] !== "string"))
        throw new Error("备份记录无效");
    }
  }
  return data;
}
export async function restoreBackup(backup) {
  const data = validateBackup(backup);
  const previous = await createBackup();
  const previousData = validateBackup(previous);
  try {
    for (const name of Object.keys(databases)) await writeDatabase(name, data[name]);
    for (const [key, value] of Object.entries(backup.localStorage)) localStorage.setItem(key, value);
  } catch (error) {
    try {
      for (const name of Object.keys(databases)) await writeDatabase(name, previousData[name], true);
      for (const key of Object.keys(backup.localStorage)) {
        if (Object.hasOwn(previous.localStorage, key))
          localStorage.setItem(key, previous.localStorage[key]);
        else localStorage.removeItem(key);
      }
    } catch {
      throw new Error("恢复和回滚失败，请保留备份文件并重新导入");
    }
    throw error;
  }
}
