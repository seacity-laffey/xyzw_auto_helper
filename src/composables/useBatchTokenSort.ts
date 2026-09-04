import type { Ref } from "vue";
import { computed, ref } from "vue";

type SortDirection = "asc" | "desc";
type SortField = "createdAt" | "lastUsed" | "name" | "server";

interface SortableToken {
  createdAt?: string | number;
  lastUsed?: string | number;
  name?: string;
  server?: string;
}

interface SortConfig {
  direction: SortDirection;
  field: SortField;
}

const defaultSort: SortConfig = { direction: "asc", field: "createdAt" };

const loadSort = (): SortConfig => {
  try {
    const saved = localStorage.getItem("tokenSortConfig");
    if (!saved)
      return { ...defaultSort };
    const parsed = JSON.parse(saved) as Partial<SortConfig>;
    const field = ["createdAt", "lastUsed", "name", "server"].includes(
      String(parsed.field),
    )
      ? (parsed.field as SortField)
      : defaultSort.field;
    return {
      direction: parsed.direction === "desc" ? "desc" : "asc",
      field,
    };
  } catch {
    return { ...defaultSort };
  }
};

const comparableValue = (token: SortableToken, field: SortField) => {
  if (field === "createdAt" || field === "lastUsed") {
    return new Date(token[field] || 0).getTime();
  }
  return token[field]?.toLowerCase() || "";
};

export const useBatchTokenSort = <Token extends SortableToken>(
  tokens: Ref<Token[]>,
) => {
  const sortConfig = ref<SortConfig>(loadSort());
  const sortOptions = [
    { label: "名称", value: "name" },
    { label: "服务器", value: "server" },
    { label: "创建时间", value: "createdAt" },
    { label: "最后使用", value: "lastUsed" },
  ];

  const sortedTokens = computed(() => {
    const direction = sortConfig.value.direction === "asc" ? 1 : -1;
    return [...tokens.value].sort((tokenA, tokenB) => {
      const valueA = comparableValue(tokenA, sortConfig.value.field);
      const valueB = comparableValue(tokenB, sortConfig.value.field);
      if (valueA < valueB)
        return -direction;
      if (valueA > valueB)
        return direction;
      return 0;
    });
  });

  const toggleSort = (field: SortField) => {
    if (sortConfig.value.field === field) {
      sortConfig.value.direction
        = sortConfig.value.direction === "asc" ? "desc" : "asc";
    } else {
      sortConfig.value = { direction: "asc", field };
    }
    localStorage.setItem("tokenSortConfig", JSON.stringify(sortConfig.value));
  };

  return { sortConfig, sortOptions, sortedTokens, toggleSort };
};
