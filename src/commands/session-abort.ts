import type { MessageDispatcher } from "../managers/MessageDispatcher"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class SessionAbortCommand implements Command {
  readonly type = "session.abort"

  async execute(dispatcher: MessageDispatcher, msg: WebviewMessage & { sessionID: string }): Promise<void> {
    const client = dispatcher.getClient()
    const directory = dispatcher.getDirectory()
    if (!client || !directory) return

    try {
      await client.session.abort({ path: { id: msg.sessionID }, query: { directory } })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("[SessionAbortCommand] Failed to abort session:", message)
      dispatcher.postMessage({ type: "server.error", message: `Failed to abort session: ${message}` })
    }
  }
}