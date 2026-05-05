import type { MessageDispatcher } from "../managers/MessageDispatcher"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class AgentsListRequestCommand implements Command {
  readonly type = "agents.list.request"

  async execute(dispatcher: MessageDispatcher, _msg: WebviewMessage): Promise<void> {
    const client = dispatcher.getClient()
    const directory = dispatcher.getDirectory()
    if (!client || !directory) return

    try {
      console.log("[AgentsListRequestCommand] Received agents.list.request")
      const result = await client.app.agents({ query: { directory } })
      console.log("[AgentsListRequestCommand] agents result:", result)
      if (result?.data) {
        dispatcher.postMessage({ type: "agents.list", agents: result.data })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("[AgentsListRequestCommand] Failed to load agents:", message)
      dispatcher.postMessage({ type: "server.error", message: `Failed to load agents: ${message}` })
    }
  }
}
