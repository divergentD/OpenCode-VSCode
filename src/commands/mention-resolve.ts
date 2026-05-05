import type { MessageDispatcher } from "../managers/MessageDispatcher"
import type { WebviewMessage, HostMessage } from "../types"
import type { Command } from "./types"

export class MentionResolveCommand implements Command {
  readonly type = "mention.resolve"

  async execute(dispatcher: MessageDispatcher, msg: WebviewMessage & { kind: "selection" | "problems" | "terminal" }): Promise<void> {
    const contextManager = dispatcher.getContextManager()
    if (!contextManager) return
    
    const post = (message: HostMessage) => dispatcher.postMessage(message)
    
    if (msg.kind === "selection") {
      const sel = contextManager.resolveSelection()
      post({ type: "context.resolved", kind: "selection", payload: sel })
    } else if (msg.kind === "problems") {
      const probs = contextManager.resolveProblems()
      post({ type: "context.resolved", kind: "problems", payload: probs })
    } else if (msg.kind === "terminal") {
      const text = contextManager.resolveTerminal()
      post({ type: "context.resolved", kind: "terminal", payload: text })
    }
  }
}
