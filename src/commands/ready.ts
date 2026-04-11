import type { ChatProvider } from "../provider"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class ReadyCommand implements Command {
  readonly type = "ready"

  async execute(provider: ChatProvider, _msg: WebviewMessage): Promise<void> {
    const client = provider["client"]
    const directory = provider["directory"]
    if (!client || !directory) return

    const result = await client.session.list({ query: { directory } })
    if (result.data) {
      provider["post"]({ type: "sessions.list", sessions: result.data })
    }
  }
}
