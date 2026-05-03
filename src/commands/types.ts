import type { MessageDispatcher } from "../managers/MessageDispatcher"
import type { WebviewMessage, HostMessage } from "../types"

export interface Command {
  readonly type: string
  execute(dispatcher: MessageDispatcher, msg: WebviewMessage): Promise<void>
}

export interface CommandContext {
  post(message: HostMessage): void
}