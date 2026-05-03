import type { MessageDispatcher } from "../managers/MessageDispatcher"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class SessionDeleteCommand implements Command {
  readonly type = "session.delete"

  async execute(dispatcher: MessageDispatcher, msg: WebviewMessage & { sessionID: string }): Promise<void> {
    const client = dispatcher.getClient()
    const directory = dispatcher.getDirectory()
    if (!client || !directory) return

    await client.session.delete({ path: { id: msg.sessionID }, query: { directory } })
    dispatcher.postMessage({ type: "session.deleted", sessionID: msg.sessionID })
  }
}