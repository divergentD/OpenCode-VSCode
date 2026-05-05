import type { MessageDispatcher } from "../managers/MessageDispatcher"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class PromptCommand implements Command {
  readonly type = "prompt"

  async execute(dispatcher: MessageDispatcher, msg: WebviewMessage & { sessionID: string; parts: Array<{ type: "text"; text: string } | { type: "file"; mime: string; url: string; filename?: string }> }): Promise<void> {
    const client = dispatcher.getClient()
    const directory = dispatcher.getDirectory()
    if (!client || !directory) return

    console.log("[opencode] Sending prompt:", msg.sessionID, "parts:", msg.parts.length)
    try {
      await client.session.prompt({
        path: { id: msg.sessionID },
        query: { directory },
        body: { parts: msg.parts },
      })
      console.log("[opencode] Prompt sent successfully")
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("[PromptCommand] Failed to send prompt:", message)
      dispatcher.postMessage({ type: "server.error", message: `Failed to send prompt: ${message}` })
    }
  }
}