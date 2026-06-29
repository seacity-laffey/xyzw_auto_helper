import { gameLogger } from "@/utils/logger";
import type { EVM, XyzwSession } from ".";
import { useLocalStorage } from "@vueuse/core";
import type { ChatResponseBody } from "@/types/gameProtocol";

type ChatMessage = Record<string, unknown>;

const chatMsgList = useLocalStorage<ChatMessage[]>('xyzw_chat_msg_list', []);

// 处理聊天消息事件，保存最新的聊天记录
export const ChatPlugin = ({
  onSome,
}: EVM) => {
  onSome(['system_newchatmessagenotify', 'system_newchatmessagenotifyresp'], (data: XyzwSession) => {
    gameLogger.info(`收到新聊天消息事件: ${data.tokenId}`, data);
    const { body } = data;
    const chatBody = body as ChatResponseBody;
    if (!body || !chatBody.chatMessage) {
      gameLogger.debug('聊天消息响应为空或格式不正确');
      return;
    }
    chatMsgList.value.push(chatBody.chatMessage);
    while (chatMsgList.value.length > 100) {
      chatMsgList.value.shift();
    }
  });
}
