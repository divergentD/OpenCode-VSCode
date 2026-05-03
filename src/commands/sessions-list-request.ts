import type { MessageDispatcher } from "../managers/MessageDispatcher"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class SessionsListRequestCommand implements Command {
  readonly type = "sessions.list.request"

  async execute(dispatcher: MessageDispatcher, _msg: WebviewMessage): Promise<void> {
    const client = dispatcher.getClient()
    const directory = dispatcher.getDirectory()
    if (!client || !directory) return

    const result = await client.session.list({ query: { directory } })
    if (result.data) {
      dispatcher.postMessage({ type: "sessions.list", sessions: result.data })
    }
  }
}