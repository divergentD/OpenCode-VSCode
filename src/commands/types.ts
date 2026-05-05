import type { MessageDispatcher } from "../managers/MessageDispatcher"
import type { WebviewMessage, HostMessage } from "../types"

export interface Command {
  readonly type: string
  execute(dispatcher: MessageDispatcher, msg: WebviewMessage): Promise<void>
}

export interface CommandContext {
  post(message: HostMessage): void
}

export interface CommandRegistry {
  get(type: string): Command | undefined
  has(type: string): boolean
  register(command: Command): void
}