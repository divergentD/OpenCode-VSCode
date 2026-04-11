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
  CommandInfo,
  AgentInfo,
  ProviderInfo,
  FileDiff,
  TodoItem,
} from "./types"

export type AppState = {
  connected: boolean
  serverError: string | null
  workspaceMissing: boolean
  sessions: SessionInfo[]
  activeSessionID: string | null
  messages: Record<string, MessageInfo[]>
  partDeltas: Record<string, string>
  permissions: PermissionRequest[]
  questions: QuestionRequest[]
  sessionStatuses: Record<string, SessionStatus>
  commands: CommandInfo[]
  contextResolved: {
    selection?: SelectionContext
    problems?: ProblemContext[]
    terminal?: string
    files?: unknown[]
  }
  agents: AgentInfo[]
  providers: ProviderInfo[]
  selectedAgent: string | null
  selectedModel: string | null
  fileChanges: Record<string, FileDiff[]>
  todos: Record<string, TodoItem[]>
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
  commands: [],
  contextResolved: {},
  agents: [],
  providers: [],
  selectedAgent: null,
  selectedModel: null,
  fileChanges: {},
  todos: {},
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
  | { type: "commands.list"; commands: CommandInfo[] }
  | { type: "config.get"; config: { model?: string; default_agent?: string } }
  | { type: "providers.list"; providers: ProviderInfo[]; default?: Record<string, string>; connected?: string[] }
  | { type: "agents.list"; agents: AgentInfo[] }
  | { type: "agent.select"; agentID: string | null }
  | { type: "model.select"; modelID: string | null }
  | { type: "session.diff"; sessionID: string; diffs: FileDiff[] }

import { actionHandlers } from "./reducers"
import { eventHandlers } from "./event-handlers"
import type { ActionHandler } from "./reducers/types"
import type { EventHandler } from "./event-handlers/types"

function handleEventAction(state: AppState, event: SseEvent): AppState {
  const { type, properties } = event
  console.log("[opencode reducer] Event:", type, properties)

  const handler = eventHandlers[type] as EventHandler | undefined
  if (handler) {
    return handler(state, properties)
  }

  return state
}

export function reducer(state: AppState, action: Action): AppState {
  if (action.type === "event") {
    return handleEventAction(state, action.event)
  }

  const handler = actionHandlers[action.type] as ActionHandler | undefined
  if (handler) {
    return handler(state, action as Record<string, unknown>)
  }

  return state
}
