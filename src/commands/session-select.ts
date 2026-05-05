import * as vscode from "vscode"
import type { MessageDispatcher } from "../managers/MessageDispatcher"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class SessionSelectCommand implements Command {
  readonly type = "session.select"

  async execute(dispatcher: MessageDispatcher, msg: WebviewMessage & { sessionID: string }): Promise<void> {
    const client = dispatcher.getClient()
    const directory = dispatcher.getDirectory()
    if (!client || !directory) return

    console.log("[SessionSelectCommand] Fetching messages for session:", msg.sessionID)
    let messages: unknown[] = []
    try {
      const result = await client.session.messages({ path: { id: msg.sessionID }, query: { directory } })
      console.log("[SessionSelectCommand] Messages result:", result)

      if (result.error) {
        console.error("[SessionSelectCommand] Failed to fetch messages:", result.error)
      } else if (result.data) {
        messages = result.data.map((item: unknown) => {
          const info = (item as Record<string, unknown>)?.info ?? {}
          const parts = (item as Record<string, unknown>)?.parts ?? []
          return { ...info, parts }
        })
        console.log("[SessionSelectCommand] Sending messages.list with", messages.length, "messages")
      } else {
        console.warn("[SessionSelectCommand] No messages data returned")
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("[SessionSelectCommand] Failed to fetch messages:", message)
      dispatcher.postMessage({ type: "server.error", message: `Failed to fetch messages: ${message}` })
    }
    dispatcher.postMessage({ type: "messages.list", sessionID: msg.sessionID, messages })

    console.log("[opencode] Fetching diff for session:", msg.sessionID)
    const fileChangesProvider = dispatcher.getFileChangesProvider()
    try {
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null
      const messageID = lastMessage?.id

      console.log("[opencode] Fetching diff with messageID:", messageID)
      const diffResult = await client.session.diff({
        path: { id: msg.sessionID },
        query: { directory, messageID }
      })
      console.log("[opencode] Diff result:", diffResult)

      if (diffResult.data && diffResult.data.length > 0) {
        console.log("[opencode] Sending session.diff with", diffResult.data.length, "diffs")
        dispatcher.postMessage({ type: "session.diff", sessionID: msg.sessionID, diffs: diffResult.data })
        fileChangesProvider?.show(msg.sessionID, diffResult.data)
        vscode.commands.executeCommand("workbench.action.focusAuxiliaryBar")
        vscode.commands.executeCommand("opencode.fileChanges.focus")
      } else {
        console.warn("[opencode] No diff data returned")
        dispatcher.postMessage({ type: "session.diff", sessionID: msg.sessionID, diffs: [] })
        fileChangesProvider?.show(msg.sessionID, [])
      }
    } catch (diffErr) {
      console.error("[opencode] Failed to fetch diff:", diffErr)
      dispatcher.postMessage({ type: "session.diff", sessionID: msg.sessionID, diffs: [] })
    }
  }
}