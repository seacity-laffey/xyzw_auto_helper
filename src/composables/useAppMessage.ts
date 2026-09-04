import { readonly, ref } from "vue";

export type AppMessageType = "error" | "info" | "success" | "warning";

interface AppMessage {
  id: number;
  text: string;
  type: AppMessageType;
}

interface MessageOptions {
  duration?: number;
}

const messages = ref<AppMessage[]>([]);
let nextMessageId = 1;

const dismiss = (id: number) => {
  messages.value = messages.value.filter((message) => message.id !== id);
};

const push = (
  type: AppMessageType,
  content: unknown,
  options?: MessageOptions,
) => {
  const id = nextMessageId++;
  const text = typeof content === "string" ? content : String(content ?? "");
  messages.value.push({ id, text, type });

  const duration = options?.duration ?? (type === "error" ? 5000 : 3200);
  if (duration > 0)
    window.setTimeout(() => dismiss(id), duration);
  return id;
};

const api = {
  error: (content: unknown, options?: MessageOptions) =>
    push("error", content, options),
  info: (content: unknown, options?: MessageOptions) =>
    push("info", content, options),
  success: (content: unknown, options?: MessageOptions) =>
    push("success", content, options),
  warning: (content: unknown, options?: MessageOptions) =>
    push("warning", content, options),
};

export const appMessages = readonly(messages);
export const dismissAppMessage = dismiss;
export const useAppMessage = () => api;
