export const DEFAULT_RESPONSE_COMMAND_MAP = Object.freeze({
  legionwar_getdetailsresp: "legionwar_getdetails",
});

export function resolveOriginalResponseCommands(responseCommand, commandMap = {}) {
  const responseKey = typeof responseCommand === "string"
    ? responseCommand.toLowerCase()
    : responseCommand;
  const mappedCommand = commandMap[responseKey]
    ?? DEFAULT_RESPONSE_COMMAND_MAP[responseKey];

  if (Array.isArray(mappedCommand))
    return mappedCommand;
  if (typeof mappedCommand === "string")
    return [mappedCommand];
  return [responseKey];
}
