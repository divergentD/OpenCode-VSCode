import type { MessageDispatcher } from "../managers/MessageDispatcher"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class SessionCreateCommand implements Command {
  readonly type = "session.create"

  async execute(dispatcher: MessageDispatcher, msg: WebviewMessage & { parentID?: string }): Promise<void> {
    const client = dispatcher.getClient()
    const directory = dispatcher.getDirectory()
    if (!client || !directory) return

    const body: { parentID?: string; title?: string } = msg.parentID ? { parentID: msg.parentID } : {}
    
    const result = await client.session.create({ query: { directory }, body })
    if (result.data) {
      dispatcher.postMessage({ type: "session.created", session: result.data })
    }
  }
}