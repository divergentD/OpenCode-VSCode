import type { MessageDispatcher } from "../managers/MessageDispatcher"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class ProvidersListRequestCommand implements Command {
  readonly type = "providers.list.request"

  async execute(dispatcher: MessageDispatcher, _msg: WebviewMessage): Promise<void> {
    const client = dispatcher.getClient()
    const directory = dispatcher.getDirectory()
    if (!client || !directory) return

    try {
      const result = await client.provider.list({ query: { directory } })
      if (result.data) {
        const providers = Array.isArray(result.data) ? result.data : (result.data as { all?: unknown[] }).all || []
        const defaults = (result.data as { default?: Record<string, string> }).default
        const connected = (result.data as { connected?: string[] }).connected || []
        dispatcher.postMessage({ type: "providers.list", providers, default: defaults, connected })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("[ProvidersListRequestCommand] Failed to list providers:", message)
      dispatcher.postMessage({ type: "server.error", message: `Failed to list providers: ${message}` })
    }
  }
}
