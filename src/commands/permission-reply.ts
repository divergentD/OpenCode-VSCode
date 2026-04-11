import type { ChatProvider } from "../provider"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class PermissionReplyCommand implements Command {
  readonly type = "permission.reply"

  async execute(provider: ChatProvider, msg: WebviewMessage & { requestID: string; reply: "once" | "always" | "reject" }): Promise<void> {
    const client = provider["client"]
    const directory = provider["directory"]
    const sessionID = provider["activeSessionID"]
    if (!client || !directory || !sessionID) return

    await client.postSessionIdPermissionsPermissionId({
      path: { id: sessionID, permissionID: msg.requestID },
      query: { directory },
      body: { response: msg.reply },
    })
  }
}
