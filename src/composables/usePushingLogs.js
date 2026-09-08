import { computed, ref } from "vue";

const MAX_LOGS = 2000;

export const usePushingLogs = ({ getToken, runningStates, selectedTokenIds }) => {
  const autoScroll = ref(true);
  const logFilterTokenId = ref(null);
  const logs = ref([]);
  const onlyErrors = ref(false);

  const visibleLogs = computed(() => logs.value.filter((log) => {
    if (logFilterTokenId.value && log.tokenId !== logFilterTokenId.value)
      return false;
    return !onlyErrors.value || log.type === "error";
  }));

  const logFilterOptions = computed(() => {
    const options = new Map();
    logs.value.forEach((log) => {
      if (!options.has(log.tokenId))
        options.set(log.tokenId, { label: log.tokenName, value: log.tokenId });
    });
    selectedTokenIds.value.forEach((id) => {
      if (!options.has(id)) {
        const token = getToken(id);
        options.set(id, { label: token?.name || id, value: id });
      }
    });
    Object.values(runningStates).forEach((state) => {
      if (state?.tokenId && !options.has(state.tokenId)) {
        options.set(state.tokenId, {
          label: state.tokenName || state.tokenId,
          value: state.tokenId,
        });
      }
    });
    return Array.from(options.values());
  });

  const addLog = (tokenId, tokenName, msg, type = "info") => {
    logs.value.push({
      time: new Date().toLocaleTimeString(),
      tokenId,
      tokenName,
      msg,
      type,
    });
    if (logs.value.length > MAX_LOGS)
      logs.value.splice(0, logs.value.length - MAX_LOGS);
  };

  const clearLogs = () => {
    logs.value = [];
  };

  return {
    autoScroll,
    addLog,
    clearLogs,
    logFilterOptions,
    logFilterTokenId,
    logs,
    onlyErrors,
    visibleLogs,
  };
};
