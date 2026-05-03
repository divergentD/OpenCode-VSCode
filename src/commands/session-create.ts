import type { MessageDispatcher } from "../managers/MessageDispatcher"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class SessionCreateCommand implements Command {
  readonly type = "session.create"

  async execute(dispatcher: MessageDispatcher, _msg: WebviewMessage): Promise<void> {
    const client = dispatcher.getClient()
    const directory = dispatcher.getDirectory()
    if (!client || !directory) return

    const result = await client.session.create({ query: { directory } })
    if (result.data) {
      dispatcher.postMessage({ type: "session.created", session: result.data })
    }
  }
}