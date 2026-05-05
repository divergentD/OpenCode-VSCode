import type { MessageDispatcher } from "../managers/MessageDispatcher"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class ReadyCommand implements Command {
  readonly type = "ready"

  async execute(dispatcher: MessageDispatcher, _msg: WebviewMessage): Promise<void> {
    const client = dispatcher.getClient()
    const directory = dispatcher.getDirectory()
    if (!client || !directory) return

    try {
      const result = await client.session.list({ query: { directory } })
      if (result.data) {
        dispatcher.postMessage({ type: "sessions.list", sessions: result.data })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("[ReadyCommand] Failed to list sessions:", message)
      dispatcher.postMessage({ type: "server.error", message: `Failed to list sessions: ${message}` })
    }
  }
}
