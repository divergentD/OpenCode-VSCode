import type { MessageDispatcher } from "../managers/MessageDispatcher"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class PermissionReplyCommand implements Command {
  readonly type = "permission.reply"

  async execute(dispatcher: MessageDispatcher, msg: WebviewMessage & { requestID: string; reply: "once" | "always" | "reject" }): Promise<void> {
    const client = dispatcher.getClient()
    const directory = dispatcher.getDirectory()
    const sessionManager = dispatcher.getSessionManager()
    if (!client || !directory || !sessionManager) return

    try {
      await client.postSessionIdPermissionsPermissionId({
        path: { id: sessionManager.getActiveSessionID(), permissionID: msg.requestID },
        query: { directory },
        body: { response: msg.reply },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("[PermissionReplyCommand] Failed to reply to permission:", message)
      dispatcher.postMessage({ type: "server.error", message: `Failed to reply to permission: ${message}` })
    }
  }
}
