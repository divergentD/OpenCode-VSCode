import type { WebviewMessage } from "../types"
import type { MessageDispatcher } from "../managers"

export interface MessageHandlerDependencies {
  messageDispatcher?: MessageDispatcher
}

export class MessageHandler {
  constructor(private dependencies: MessageHandlerDependencies) {}

  public async handleMessage(msg: WebviewMessage): Promise<void> {
    await this.dependencies.messageDispatcher?.handleMessage(msg)
  }

  public setMessageDispatcher(dispatcher: MessageDispatcher): void {
    this.dependencies.messageDispatcher = dispatcher
  }
}