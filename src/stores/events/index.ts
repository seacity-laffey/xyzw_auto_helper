
import { gameLogger } from '@/utils/logger';
import { XyzwWebSocketClient } from '@/utils/xyzwWebSocket';
import { EventEmitter } from 'event-emitter3';
import type { GameDataRef, GamePacket, GameResponseBody } from '@/types/gameProtocol';

import { AckPlugin } from './ack';
import { ChatPlugin } from './chat';
import { HangupPlugin } from './hangup';
import { LegionPlugin } from './legion';
import { RolePlugin } from './role';
import { StudyPlugin } from './study';
import { TeamPlugin } from './team';
import { TowerPlugin } from './tower';

type EventArgs = unknown[];
type EventListener = (data: XyzwSession, ...args: EventArgs) => void | Promise<void>;

export const $emit = new EventEmitter();
export const events: Set<string> = new Set<string>();
$emit.on('$any', (cmd: string, data: XyzwSession) => {
  gameLogger.warn(`收到未处理事件: ${cmd} TokenID: ${data.tokenId}`, data);
});

export const onSome = (event: string[], listener: EventListener) => {
  event.map((e) => events.add(e));
  event.forEach(evt => {
    $emit.on(evt, listener);
  })
}

export const emitPlus = (
  event: string | symbol,
  ...args: EventArgs
): boolean => {
  // 先触发具体事件，然后触发$any事件
  const result = $emit.emit(event, ...args);
  if (!events.has(event as string)) {
    $emit.emit("$any", event, ...args);
  }
  return result;
};

export interface XyzwSession {
  id?: string;
  tokenId: string;
  cmd?: string;
  token?: unknown;
  body: GameResponseBody;
  message?: GamePacket;
  client: XyzwWebSocketClient | null;
  gameData: GameDataRef;
}

export interface EVM {
  onSome: (event: string[], listener: EventListener) => void;
  emitPlus: (event: string | symbol, ...args: EventArgs) => boolean;
  $emit: EventEmitter;
}

const evmInst: EVM = {
  onSome,
  emitPlus,
  $emit,
};

AckPlugin(evmInst);

RolePlugin(evmInst);

TeamPlugin(evmInst);

StudyPlugin(evmInst);

TowerPlugin(evmInst);

LegionPlugin(evmInst);

ChatPlugin(evmInst);

HangupPlugin(evmInst);




