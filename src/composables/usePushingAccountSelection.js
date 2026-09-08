import { computed, ref, watch } from "vue";

const statusClass = (status) => ({
  connected: "status-green",
  connecting: "status-blue",
  error: "status-red",
})[status] || "status-gray";

const statusTitle = (status) => ({
  connected: "已连接",
  connecting: "连接中",
  disconnected: "未连接",
  disconnecting: "断开中",
  error: "连接异常",
})[status] || "未连接";

export const usePushingAccountSelection = ({
  getConnectionStatus,
  selectedTokenIds,
  tokenGroups,
  tokens,
}) => {
  const searchKeyword = ref("");
  const selectedGroupIds = ref([]);

  watch(
    tokens,
    (currentTokens) => {
      const validIds = new Set(currentTokens.map((token) => token.id));
      selectedTokenIds.value = selectedTokenIds.value.filter((id) => validIds.has(id));
      selectedGroupIds.value = selectedGroupIds.value.filter((groupId) =>
        tokenGroups.value.some((group) => group.id === groupId),
      );
    },
    { immediate: true },
  );

  const filteredTokens = computed(() => {
    const keyword = searchKeyword.value.trim().toLowerCase();
    const list = [...tokens.value].sort((leftToken, rightToken) => {
      const left = new Date(
        leftToken.lastUsed || leftToken.updatedAt || leftToken.createdAt || 0,
      ).getTime();
      const right = new Date(
        rightToken.lastUsed || rightToken.updatedAt || rightToken.createdAt || 0,
      ).getTime();
      return left - right;
    });

    const visible = keyword
      ? list.filter((token) => [token.name, token.server, token.remark, token.id]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword)))
      : list;

    return visible.map((token) => {
      const status = getConnectionStatus(token.id);
      return {
        ...token,
        selected: selectedTokenIds.value.includes(token.id),
        statusClass: statusClass(status),
        statusTitle: statusTitle(status),
      };
    });
  });

  const groupModels = computed(() => tokenGroups.value.map((group) => {
    const selected = selectedGroupIds.value.includes(group.id);
    return {
      ...group,
      selected,
      style: selected
        ? { backgroundColor: group.color, borderColor: group.color, color: "#fff" }
        : { borderColor: group.color, color: group.color },
    };
  }));

  const allVisibleSelected = computed(() => filteredTokens.value.length > 0
    && filteredTokens.value.every((token) => token.selected));
  const someVisibleSelected = computed(() => filteredTokens.value.some((token) => token.selected)
    && !allVisibleSelected.value);

  const toggleToken = (tokenId, checked) => {
    selectedTokenIds.value = checked
      ? [...new Set([...selectedTokenIds.value, tokenId])]
      : selectedTokenIds.value.filter((id) => id !== tokenId);
  };

  const toggleAllVisible = (checked) => {
    const visibleIds = filteredTokens.value.map((token) => token.id);
    if (checked) {
      selectedTokenIds.value = [...new Set([...selectedTokenIds.value, ...visibleIds])];
      return;
    }
    const visibleSet = new Set(visibleIds);
    selectedTokenIds.value = selectedTokenIds.value.filter((id) => !visibleSet.has(id));
  };

  const toggleGroup = (groupId) => {
    const group = tokenGroups.value.find((item) => item.id === groupId);
    if (!group)
      return;
    const groupIndex = selectedGroupIds.value.indexOf(group.id);
    const validIds = (group.tokenIds || []).filter((id) =>
      tokens.value.some((token) => token.id === id),
    );

    if (groupIndex >= 0) {
      selectedGroupIds.value.splice(groupIndex, 1);
      const groupSet = new Set(validIds);
      selectedTokenIds.value = selectedTokenIds.value.filter((id) => !groupSet.has(id));
      return;
    }

    selectedGroupIds.value.push(group.id);
    selectedTokenIds.value = [...new Set([...selectedTokenIds.value, ...validIds])];
  };

  const clearAccountSelection = () => {
    selectedTokenIds.value = [];
    selectedGroupIds.value = [];
  };

  return {
    allVisibleSelected,
    clearAccountSelection,
    filteredTokens,
    groupModels,
    searchKeyword,
    selectedGroupIds,
    someVisibleSelected,
    toggleAllVisible,
    toggleGroup,
    toggleToken,
  };
};
