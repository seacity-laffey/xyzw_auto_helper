const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

export const getTokenDisplayName = (token) => {
  const name = normalizeText(token?.name);
  // 兼容导入时的默认名称“昵称-角色序号-角色ID”，仅格式化显示。
  return name.replace(/-[0-2]-\d+$/, "").trim() || name || "未命名账号";
};

export const getRoleTokenMetadataUpdates = (token, roleBody) => {
  const updates = {};
  const roleName = normalizeText(roleBody?.role?.name);
  const currentName = normalizeText(token?.name);

  if (roleName && !currentName) {
    updates.name = roleName;
  }

  const server = normalizeText(
    roleBody?.role?.serverName ||
      roleBody?.serverName ||
      roleBody?.role?.server ||
      roleBody?.server,
  );

  if (server && server !== token?.server) {
    updates.server = server;
  }

  return updates;
};
