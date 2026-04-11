import type { ChatProvider } from "../provider"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class SymbolsSearchCommand implements Command {
  readonly type = "symbols.search"

  async execute(provider: ChatProvider, msg: WebviewMessage & { query: string }): Promise<void> {
    const client = provider["client"]
    const directory = provider["directory"]
    if (!client || !directory) return

    const result = await client.find.symbols({ query: { directory, query: msg.query } })
    provider["post"]({ type: "context.resolved", kind: "files", payload: result.data })
  }
}
