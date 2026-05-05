import type { MessageDispatcher } from "../managers/MessageDispatcher"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class CommandsListRequestCommand implements Command {
  readonly type = "commands.list.request"

  async execute(dispatcher: MessageDispatcher, _msg: WebviewMessage): Promise<void> {
    const client = dispatcher.getClient()
    const directory = dispatcher.getDirectory()
    if (!client || !directory) return

    try {
      console.log("[CommandsListRequestCommand] Received commands.list.request")
      const result = await client.command.list({ query: { directory } })
      console.log("[CommandsListRequestCommand] command.list result:", result)
      if (result.data) {
        dispatcher.postMessage({ type: "commands.list", commands: result.data })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("[CommandsListRequestCommand] Failed to list commands:", message)
      dispatcher.postMessage({ type: "server.error", message: `Failed to list commands: ${message}` })
    }
  }
}
