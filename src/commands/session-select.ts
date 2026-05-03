import * as vscode from "vscode"
import type { ChatProvider } from "../provider"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class SessionSelectCommand implements Command {
  readonly type = "session.select"

  async execute(provider: ChatProvider, msg: WebviewMessage & { sessionID: string }): Promise<void> {
    const client = provider["client"]
    const directory = provider["directory"]
    const fileChangesProvider = provider["fileChangesProvider"]
    if (!client || !directory) return

    console.log("[opencode] Fetching messages for session:", msg.sessionID)
    const result = await client.session.messages({ path: { id: msg.sessionID }, query: { directory } })
    console.log("[opencode] Messages result:", result)
    
    let messages: any[] = []
    if (result.error) {
      console.error("[opencode] Failed to fetch messages:", result.error)
    } else if (result.data) {
      // Transform API response { info, parts } to webview format
      messages = result.data.map((item: any) => ({
        ...item.info,
        parts: item.parts || []
      }))
      console.log("[opencode] Sending messages.list with", messages.length, "messages")
      console.log("[opencode] First message sample:", messages[0] ? JSON.stringify(messages[0], null, 2) : "none")
      console.log("[opencode] Messages with parts:", messages.filter((m: any) => m.parts && m.parts.length > 0).length)
    } else {
      console.warn("[opencode] No messages data returned")
    }
    provider["post"]({ type: "messages.list", sessionID: msg.sessionID, messages })

    // Load session diff
    console.log("[opencode] Fetching diff for session:", msg.sessionID)
    try {
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null
      const messageID = lastMessage?.id
      
      console.log("[opencode] Fetching diff with messageID:", messageID)
      const diffResult = await client.session.diff({ 
        path: { id: msg.sessionID }, 
        query: { directory, messageID } 
      })
      console.log("[opencode] Diff result:", diffResult)
      
      provider["activeSessionID"] = msg.sessionID
      if (diffResult.data && diffResult.data.length > 0) {
        console.log("[opencode] Sending session.diff with", diffResult.data.length, "diffs")
        provider["activeSessionDiffs"] = diffResult.data
        provider["post"]({ type: "session.diff", sessionID: msg.sessionID, diffs: diffResult.data })
        fileChangesProvider?.show(msg.sessionID, diffResult.data)
        vscode.commands.executeCommand("workbench.action.focusAuxiliaryBar")
        vscode.commands.executeCommand("opencode.fileChanges.focus")
      } else {
        console.warn("[opencode] No diff data returned")
        provider["activeSessionDiffs"] = []
        provider["post"]({ type: "session.diff", sessionID: msg.sessionID, diffs: [] })
        fileChangesProvider?.show(msg.sessionID, [])
      }
    } catch (diffErr) {
      console.error("[opencode] Failed to fetch diff:", diffErr)
      provider["activeSessionDiffs"] = []
      provider["post"]({ type: "session.diff", sessionID: msg.sessionID, diffs: [] })
    }
  }
}
