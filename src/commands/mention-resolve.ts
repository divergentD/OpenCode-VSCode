import type { ChatProvider } from "../provider"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class MentionResolveCommand implements Command {
  readonly type = "mention.resolve"

  async execute(provider: ChatProvider, msg: WebviewMessage & { kind: "selection" | "problems" | "terminal" }): Promise<void> {
    const mentions = provider["mentions"]
    
    if (msg.kind === "selection") {
      const sel = mentions.resolveSelection()
      provider["post"]({ type: "context.resolved", kind: "selection", payload: sel })
    } else if (msg.kind === "problems") {
      const probs = mentions.resolveProblems()
      provider["post"]({ type: "context.resolved", kind: "problems", payload: probs })
    } else if (msg.kind === "terminal") {
      const text = mentions.resolveTerminal()
      provider["post"]({ type: "context.resolved", kind: "terminal", payload: text })
    }
  }
}
