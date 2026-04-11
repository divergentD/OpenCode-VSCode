import type { ChatProvider } from "../provider"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class CommandsListRequestCommand implements Command {
  readonly type = "commands.list.request"

  async execute(provider: ChatProvider, _msg: WebviewMessage): Promise<void> {
    const client = provider["client"]
    const directory = provider["directory"]
    if (!client || !directory) return

    console.log("[provider] Received commands.list.request")
    const result = await client.command.list({ query: { directory } })
    console.log("[provider] command.list result:", result)
    if (result.data) {
      provider["post"]({ type: "commands.list", commands: result.data })
    }
  }
}
