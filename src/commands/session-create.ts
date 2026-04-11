import type { ChatProvider } from "../provider"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class SessionCreateCommand implements Command {
  readonly type = "session.create"

  async execute(provider: ChatProvider, _msg: WebviewMessage): Promise<void> {
    const client = provider["client"]
    const directory = provider["directory"]
    if (!client || !directory) return

    const result = await client.session.create({ query: { directory } })
    if (result.data) {
      provider["post"]({ type: "session.created", session: result.data })
    }
  }
}
