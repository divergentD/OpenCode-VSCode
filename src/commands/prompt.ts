import type { ChatProvider } from "../provider"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class PromptCommand implements Command {
  readonly type = "prompt"

  async execute(provider: ChatProvider, msg: WebviewMessage & { sessionID: string; parts: Array<{ type: "text"; text: string } | { type: "file"; mime: string; url: string; filename?: string }> }): Promise<void> {
    const client = provider["client"]
    const directory = provider["directory"]
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
      console.error("[opencode] Failed to send prompt:", err)
    }
  }
}
