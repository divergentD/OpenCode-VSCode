import type { MessageDispatcher } from "../managers/MessageDispatcher"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class SessionDeleteCommand implements Command {
  readonly type = "session.delete"

  async execute(dispatcher: MessageDispatcher, msg: WebviewMessage & { sessionID: string }): Promise<void> {
    const client = dispatcher.getClient()
    const directory = dispatcher.getDirectory()
    if (!client || !directory) return

    try {
      const sessionsResult = await client.session.list({ query: { directory } })
      if (sessionsResult.data && Array.isArray(sessionsResult.data)) {
        const children = sessionsResult.data.filter((s: any) => s.parentID === msg.sessionID)
        for (const child of children) {
          await client.session.delete({ 
            path: { id: child.id }, 
            query: { directory } 
          })
          dispatcher.postMessage({ type: "session.deleted", sessionID: child.id })
        }
      }
    } catch (err) {
      console.warn("[opencode] Failed to fetch children for cascade delete:", err)
    }

    try {
      await client.session.delete({ path: { id: msg.sessionID }, query: { directory } })
      dispatcher.postMessage({ type: "session.deleted", sessionID: msg.sessionID })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("[SessionDeleteCommand] Failed to delete session:", message)
      dispatcher.postMessage({ type: "server.error", message: `Failed to delete session: ${message}` })
    }
  }
}