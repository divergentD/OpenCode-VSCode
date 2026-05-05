import type { MessageDispatcher } from "../managers/MessageDispatcher"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class SymbolsSearchCommand implements Command {
  readonly type = "symbols.search"

  async execute(dispatcher: MessageDispatcher, msg: WebviewMessage & { query: string }): Promise<void> {
    const client = dispatcher.getClient()
    const directory = dispatcher.getDirectory()
    if (!client || !directory) return

    try {
      const result = await client.find.symbols({ query: { directory, query: msg.query } })
      dispatcher.postMessage({ type: "context.resolved", kind: "files", payload: result.data })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("[SymbolsSearchCommand] Failed to search symbols:", message)
      dispatcher.postMessage({ type: "server.error", message: `Failed to search symbols: ${message}` })
    }
  }
}
