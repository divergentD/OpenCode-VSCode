import type { WebviewMessage } from "../types"
import type { MessageDispatcher } from "../managers"

export interface MessageHandlerDependencies {
  messageDispatcher?: MessageDispatcher
  onSessionSelect?: (sessionID: string) => void
}

export class MessageHandler {
  constructor(private dependencies: MessageHandlerDependencies) {}

  public async handleMessage(msg: WebviewMessage): Promise<void> {
    if (msg.type === "session.select") {
      const sessionID = (msg as any).sessionID
      this.dependencies.onSessionSelect?.(sessionID)
    }

    await this.dependencies.messageDispatcher?.handleMessage(msg)
  }

  public setMessageDispatcher(dispatcher: MessageDispatcher): void {
    this.dependencies.messageDispatcher = dispatcher
  }
}