import type { ChatProvider } from "../provider"
import type { WebviewMessage, HostMessage } from "../types"

export interface Command {
  readonly type: string
  execute(provider: ChatProvider, msg: WebviewMessage): Promise<void>
}

export interface CommandContext {
  post(message: HostMessage): void
}
