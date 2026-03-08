import type {
  SessionInfo,
  MessageInfo,
  PartData,
  SseEvent,
  PermissionRequest,
  QuestionRequest,
  SessionStatus,
  SelectionContext,
  ProblemContext,
} from "./types"

export type AppState = {
  connected: boolean
  serverError: string | null
  workspaceMissing: boolean
  sessions: SessionInfo[]
  activeSessionID: string | null
  messages: Record<string, MessageInfo[]> // sessionID → messages
  partDeltas: Record<string, string> // partID → accumulated streaming text
  permissions: PermissionRequest[]
  questions: QuestionRequest[]
  sessionStatuses: Record<string, SessionStatus>
  contextResolved: {
    selection?: SelectionContext
    problems?: ProblemContext[]
    terminal?: string
    files?: unknown[]
  }
}

export const initialState: AppState = {
  connected: false,
  serverError: null,
  workspaceMissing: false,
  sessions: [],
  activeSessionID: null,
  messages: {},
  partDeltas: {},
  permissions: [],
  questions: [],
  sessionStatuses: {},
  contextResolved: {},
}

export type Action =
  | { type: "server.ready" }
  | { type: "server.error"; message: string }
  | { type: "workspace.missing" }
  | { type: "sessions.list"; sessions: SessionInfo[] }
  | { type: "session.created"; session: SessionInfo }
  | { type: "session.deleted"; sessionID: string }
  | { type: "messages.list"; sessionID: string; messages: MessageInfo[] }
  | { type: "event"; event: SseEvent }
  | { type: "context.resolved"; kind: "selection" | "problems" | "terminal" | "files"; payload: unknown }

function updatePart(msgs: MessageInfo[], part: PartData): MessageInfo[] {
  const idx = msgs.findIndex((m) => m.id === part.messageID)
  if (idx < 0) return msgs
  const msg = msgs[idx]
  const parts = msg.parts ?? []
  const pi = parts.findIndex((p) => p.id === part.id)
  const updated = pi >= 0 ? [...parts.slice(0, pi), part, ...parts.slice(pi + 1)] : [...parts, part]
  return [...msgs.slice(0, idx), { ...msg, parts: updated }, ...msgs.slice(idx + 1)]
}

function updateMessage(msgs: MessageInfo[], info: MessageInfo): MessageInfo[] {
  const idx = msgs.findIndex((m) => m.id === info.id)
  if (idx < 0) return [...msgs, info]
  // Merge with existing message to preserve parts (event info doesn't include parts)
  const existing = msgs[idx]
  return [...msgs.slice(0, idx), { ...existing, ...info }, ...msgs.slice(idx + 1)]
}


export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "server.ready":
      return { ...state, connected: true, serverError: null }

    case "server.error":
      return { ...state, connected: false, serverError: action.message }

    case "workspace.missing":
      return { ...state, workspaceMissing: true }

    case "sessions.list":
      return { ...state, sessions: action.sessions }

    case "session.created":
      return {
        ...state,
        sessions: [...state.sessions.filter((s) => s.id !== action.session.id), action.session],
        activeSessionID: action.session.id,
      }

    case "session.deleted":
      return {
        ...state,
        sessions: state.sessions.filter((s) => s.id !== action.sessionID),
        activeSessionID: state.activeSessionID === action.sessionID ? null : state.activeSessionID,
      }

    case "messages.list":
      return {
        ...state,
        messages: { ...state.messages, [action.sessionID]: action.messages },
        activeSessionID: action.sessionID,
      }

    case "event": {
      const { type, properties } = action.event
      console.log("[opencode reducer] Event:", type, properties)
      switch (type) {
        case "message.updated": {
          const info = properties.info as MessageInfo
          const sessionID = info.sessionID
          const msgs = state.messages[sessionID] ?? []
          return { ...state, messages: { ...state.messages, [sessionID]: updateMessage(msgs, info) } }
        }
        case "message.part.updated": {
          const part = properties.part as PartData
          const sessionID = part.sessionID
          const msgs = state.messages[sessionID] ?? []
          return { ...state, messages: { ...state.messages, [sessionID]: updatePart(msgs, part) } }
        }
        case "message.part.delta": {
          const { partID, field, delta } = properties as { partID: string; field: string; delta: string }
          if (field !== "text") return state
          const current = state.partDeltas[partID] ?? ""
          return { ...state, partDeltas: { ...state.partDeltas, [partID]: current + delta } }
        }
        case "permission.asked": {
          const {
            id,
            type: permType,
            metadata,
          } = properties as { id: string; type: string; metadata?: Record<string, unknown> }
          const req: PermissionRequest = {
            requestID: id,
            type: permType,
            command: metadata?.command as string | undefined,
            path: metadata?.path as string | undefined,
            description: metadata?.description as string | undefined,
          }
          return { ...state, permissions: [...state.permissions, req] }
        }
        case "permission.replied": {
          const { id } = properties as { id: string }
          return { ...state, permissions: state.permissions.filter((p) => p.requestID !== id) }
        }
        case "question.asked": {
          const { id, message, options } = properties as { id: string; message: string; options?: string[] }
          const req: QuestionRequest = { requestID: id, question: message, options }
          return { ...state, questions: [...state.questions, req] }
        }
        case "question.answered": {
          const { id } = properties as { id: string }
          return { ...state, questions: state.questions.filter((q) => q.requestID !== id) }
        }
        case "session.status": {
          const { sessionID, status } = properties as { sessionID: string; status: SessionStatus }
          return { ...state, sessionStatuses: { ...state.sessionStatuses, [sessionID]: status } }
        }
        case "session.updated": {
          const info = properties.info as SessionInfo
          const sessions = state.sessions.map((s) => (s.id === info.id ? info : s))
          return { ...state, sessions }
        }
        default:
          return state
      }
    }

    case "context.resolved":
      return {
        ...state,
        contextResolved: { ...state.contextResolved, [action.kind]: action.payload },
      }

    default:
      return state
  }
}
