// HostMessage — what extension host sends to webview
export type HostMessage =
  | { type: "server.ready"; url: string }
  | { type: "server.error"; message: string }
  | { type: "sessions.list"; sessions: SessionInfo[] }
  | { type: "session.created"; session: SessionInfo }
  | { type: "session.deleted"; sessionID: string }
  | { type: "messages.list"; sessionID: string; messages: MessageInfo[] }
  | { type: "event"; event: SseEvent }
  | { type: "context.resolved"; kind: "selection" | "problems" | "terminal" | "files"; payload: unknown }
  | { type: "providers.list"; providers: ProviderInfo[]; default?: Record<string, string>; connected?: string[] }
  | { type: "commands.list"; commands: CommandInfo[] }
  | { type: "config.get"; config: { model?: string; default_agent?: string } }
  | { type: "agents.list"; agents: AgentInfo[] }
  | { type: "workspace.missing" }
  | { type: "session.diff"; sessionID: string; diffs: FileDiff[] }
  | { type: "todos.list"; sessionID: string; todos: TodoItem[] }
  | { type: "todo.created"; todo: TodoItem }
  | { type: "todo.updated"; todo: TodoItem }
  | { type: "todo.deleted"; todoID: string; sessionID: string }
  | { type: "theme.changed"; theme: { kind: "light" | "dark" | "highContrast" | "highContrastLight" } }


// WebviewMessage — what webview sends to extension host
export type WebviewMessage =
  | { type: "ready" }
  | { type: "sessions.list.request" }
  | { type: "session.create" }
  | { type: "session.select"; sessionID: string }
  | { type: "session.delete"; sessionID: string }
  | { type: "session.abort"; sessionID: string }
  | { type: "prompt"; sessionID: string; parts: PromptPart[] }
  | { type: "permission.reply"; requestID: string; reply: "once" | "always" | "reject" }
  | { type: "question.reply"; requestID: string; answers: string[][] }
  | { type: "question.reject"; requestID: string }
  | { type: "mention.resolve"; kind: "selection" | "problems" | "terminal" }
  | { type: "files.search"; query: string }
  | { type: "symbols.search"; query: string }
  | { type: "providers.list.request" }
  | { type: "commands.list.request" }
  | { type: "agents.list.request" }
  | { type: "file.open"; path: string; line?: number; column?: number }
  | { type: "file.diff"; path: string; before: string; after: string }
  | { type: "todo.create"; sessionID: string; title: string; description?: string; priority?: "low" | "medium" | "high" }
  | { type: "todo.update"; todoID: string; updates: Partial<Omit<TodoItem, "id" | "sessionID" | "createdAt">> }
  | { type: "todo.delete"; todoID: string }
  | { type: "todos.list.request"; sessionID: string }

export type PromptPart = { type: "text"; text: string } | { type: "file"; mime: string; url: string; filename?: string }

// Simplified types (mirrors SDK but without complex imports)
export type SessionInfo = {
  id: string
  title: string
  directory: string
  time: { created: number; updated: number }
  [key: string]: unknown
}

export type PartBase = { id: string; sessionID: string; messageID: string }

export type TextPartData = PartBase & {
  type: "text"
  text: string
  time?: { start: number; end?: number }
}

export type ToolPartData = PartBase & {
  type: "tool"
  tool?: string
  toolName: string
  state: {
    status: "pending" | "running" | "completed" | "error"
    title?: string
    input?: unknown
    output?: string
    error?: string
    metadata?: Record<string, unknown>
  }
}

export type ReasoningPartData = PartBase & {
  type: "reasoning"
  text: string
}

export type PatchPartData = PartBase & {
  type: "patch"
  files: string[]
}

export type StepStartPartData = PartBase & {
  type: "step-start"
  title?: string
}

export type StepFinishPartData = PartBase & {
  type: "step-finish"
  usage?: { tokens?: { input?: number; output?: number } }
}

export type PartData =
  | TextPartData
  | ToolPartData
  | ReasoningPartData
  | PatchPartData
  | StepStartPartData
  | StepFinishPartData
  | (PartBase & { type: string })

export type MessageInfo = {
  id: string
  sessionID: string
  role: "user" | "assistant"
  parts: PartData[]
  time: { created: number; completed?: number }
  error?: { message: string }
  [key: string]: unknown
}

export type ProviderInfo = {
  id: string
  name: string
  models?: Array<{ id: string; name?: string }>
  [key: string]: unknown
}


// SSE event types (mirrors SDK Event union)
export type SseEvent = {
  type: string
  properties: Record<string, unknown>
}

// Permission request displayed inline
export type PermissionRequest = {
  requestID: string
  type: string
  command?: string
  path?: string
  description?: string
}

// Question request displayed inline
export type QuestionRequest = {
  requestID: string
  question: string
  options?: string[]
}

export type SessionStatus = "idle" | "busy" | "error"

export type TodoStatus = "pending" | "in_progress" | "completed"

export type TodoItem = {
  id: string
  sessionID: string
  title: string
  description?: string
  status: TodoStatus
  priority?: "low" | "medium" | "high"
  createdAt: number
  updatedAt?: number
  [key: string]: unknown
}

// Command info from SDK
export type CommandInfo = {
  id: string
  name: string
  description?: string
  source?: "command" | "mcp" | "skill"
  [key: string]: unknown
}

// Agent info from SDK (matches SDK Agent type)
export type AgentInfo = {
  name: string
  description?: string
  mode: "subagent" | "primary" | "all"
  builtIn: boolean
  model?: {
    modelID: string
    providerID: string
  }
  [key: string]: unknown
}

// Context resolved from @mentions
export type SelectionContext = {
  text: string
  file: string
  range: string
}

export type ProblemContext = {
  file: string
  line: number
  severity: "error" | "warning" | "info"
  message: string
}

// File change tracking types
export type FileDiff = {
  file: string
  before: string
  after: string
  additions: number
  deletions: number
}

export type SessionFileChange = {
  sessionID: string
  diffs: FileDiff[]
  lastUpdated: number
}
