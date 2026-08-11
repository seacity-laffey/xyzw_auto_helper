const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

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
