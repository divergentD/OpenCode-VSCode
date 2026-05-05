import type { MessageDispatcher } from "../managers/MessageDispatcher"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class SessionCreateCommand implements Command {
  readonly type = "session.create"

  async execute(dispatcher: MessageDispatcher, msg: WebviewMessage & { parentID?: string }): Promise<void> {
    const client = dispatcher.getClient()
    const directory = dispatcher.getDirectory()
    if (!client || !directory) return

    try {
      const body: { parentID?: string; title?: string } = msg.parentID ? { parentID: msg.parentID } : {}
      
      const result = await client.session.create({ query: { directory }, body })
      if (result.data) {
        dispatcher.postMessage({ type: "session.created", session: result.data })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("[SessionCreateCommand] Failed to create session:", message)
      dispatcher.postMessage({ type: "server.error", message: `Failed to create session: ${message}` })
    }
  }
}