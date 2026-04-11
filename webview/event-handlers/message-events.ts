import type { AppState } from "../state"
import type { MessageInfo, TextPartData, SessionStatus } from "../types"
import { updateMessage, updatePart } from "../reducers/messages"
import { parseTodosFromMessage, mergeTodos } from "../utils/todos"
import type { EventHandler } from "./types"

export const handleMessageUpdated: EventHandler<{ info: MessageInfo }> = (
  state,
  { info }
) => {
  if (!info || !info.sessionID) return state

  const sessionID = info.sessionID
  const msgs = state.messages[sessionID] ?? []
  const newState = {
    ...state,
    messages: { ...state.messages, [sessionID]: updateMessage(msgs, info) },
  }

  if (info.role === "assistant") {
    const parsedTodos = parseTodosFromMessage(info)
    if (parsedTodos.length > 0) {
      const existingTodos = newState.todos[sessionID] ?? []
      newState.todos = {
        ...newState.todos,
        [sessionID]: mergeTodos(existingTodos, parsedTodos),
      }
    }
  }

  return newState
}

export const handleMessagePartUpdated: EventHandler<{ part: TextPartData }> = (
  state,
  { part }
) => {
  if (!part || !part.sessionID) return state

  const sessionID = part.sessionID
  const msgs = state.messages[sessionID] ?? []
  const newState = {
    ...state,
    messages: { ...state.messages, [sessionID]: updatePart(msgs, part) },
  }

  if (part.type === "text") {
    const message = newState.messages[sessionID]?.find((m) => m.id === part.messageID)
    if (message && message.role === "assistant") {
      const parsedTodos = parseTodosFromMessage(message)
      if (parsedTodos.length > 0) {
        const existingTodos = newState.todos[sessionID] ?? []
        newState.todos = {
          ...newState.todos,
          [sessionID]: mergeTodos(existingTodos, parsedTodos),
        }
      }
    }
  }

  return newState
}

export const handleMessagePartDelta: EventHandler<{
  partID: string
  field: string
  delta: string
}> = (state, { partID, field, delta }) => {
  if (field !== "text") return state
  const current = state.partDeltas[partID] ?? ""
  return {
    ...state,
    partDeltas: { ...state.partDeltas, [partID]: current + delta },
  }
}