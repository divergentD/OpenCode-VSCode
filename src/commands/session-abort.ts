import type { ChatProvider } from "../provider"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class SessionAbortCommand implements Command {
  readonly type = "session.abort"

  async execute(provider: ChatProvider, msg: WebviewMessage & { sessionID: string }): Promise<void> {
    const client = provider["client"]
    const directory = provider["directory"]
    if (!client || !directory) return

    await client.session.abort({ path: { id: msg.sessionID }, query: { directory } })
  }
}
