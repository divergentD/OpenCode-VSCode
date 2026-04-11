import type { ChatProvider } from "../provider"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class AgentsListRequestCommand implements Command {
  readonly type = "agents.list.request"

  async execute(provider: ChatProvider, _msg: WebviewMessage): Promise<void> {
    const client = provider["client"]
    const directory = provider["directory"]
    if (!client || !directory) return

    console.log("[provider] Received agents.list.request")
    try {
      const result = await client.app.agents({ query: { directory } })
      console.log("[provider] agents result:", result)
      console.log("[provider] agent.list result:", result)
      if (result?.data) {
        provider["post"]({ type: "agents.list", agents: result.data })
      }
    } catch (err) {
      console.error("[provider] Failed to load agents:", err)
    }
  }
}
