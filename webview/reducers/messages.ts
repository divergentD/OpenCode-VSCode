import type { AppState } from "../state"
import type { MessageInfo, PartData } from "../types"
import type { ActionHandler } from "./types"
import { extractTodosFromMessages } from "../utils/todos"

function updatePart(msgs: MessageInfo[], part: PartData): MessageInfo[] {
  const idx = msgs.findIndex((m) => m.id === part.messageID)
  if (idx < 0) return msgs
  const msg = msgs[idx]
  const parts = msg.parts ?? []
  const pi = parts.findIndex((p) => p.id === part.id)
  const updated =
    pi >= 0 ? [...parts.slice(0, pi), part, ...parts.slice(pi + 1)] : [...parts, part]
  return [...msgs.slice(0, idx), { ...msg, parts: updated }, ...msgs.slice(idx + 1)]
}

function updateMessage(msgs: MessageInfo[], info: MessageInfo): MessageInfo[] {
  const idx = msgs.findIndex((m) => m.id === info.id)
  if (idx < 0) return [...msgs, info]
  const existing = msgs[idx]
  return [...msgs.slice(0, idx), { ...existing, ...info }, ...msgs.slice(idx + 1)]
}

export { updatePart, updateMessage }

export const handleMessagesList: ActionHandler<{
  sessionID: string
  messages: MessageInfo[]
}> = (state, { sessionID, messages }) => {
  console.log("[reducer messages.list] sessionID:", sessionID)
  console.log("[reducer messages.list] messages count:", messages.length)

  const allTodos = extractTodosFromMessages(messages)

  console.log("[reducer messages.list] total todos:", allTodos.length)

  return {
    ...state,
    messages: { ...state.messages, [sessionID]: messages },
    activeSessionID: sessionID,
    todos:
      allTodos.length > 0 ? { ...state.todos, [sessionID]: allTodos } : state.todos,
  }
}
