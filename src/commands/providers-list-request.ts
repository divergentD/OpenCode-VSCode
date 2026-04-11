import type { ChatProvider } from "../provider"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class ProvidersListRequestCommand implements Command {
  readonly type = "providers.list.request"

  async execute(provider: ChatProvider, _msg: WebviewMessage): Promise<void> {
    const client = provider["client"]
    const directory = provider["directory"]
    if (!client || !directory) return

    const result = await client.provider.list({ query: { directory } })
    if (result.data) {
      const providers = Array.isArray(result.data) ? result.data : (result.data as { all?: unknown[] }).all || []
      const defaults = (result.data as { default?: Record<string, string> }).default
      const connected = (result.data as { connected?: string[] }).connected || []
      provider["post"]({ type: "providers.list", providers, default: defaults, connected })
    }
  }
}
