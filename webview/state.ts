import type {
  SessionInfo,
  MessageInfo,
  PartData,
  TextPartData,
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
  messages: Record<string, MessageInfo[]> // sessionID → messages
  partDeltas: Record<string, string> // partID → accumulated streaming text
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
  fileChanges: Record<string, FileDiff[]> // sessionID → file changes
  todos: Record<string, TodoItem[]> // sessionID → todos
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

// Tool call data interfaces
interface TodoItemFromTool {
  content: string
  status: "pending" | "in_progress" | "completed"
  priority?: "low" | "medium" | "high"
}

interface ToolCallInput {
  todos?: TodoItemFromTool[]
  [key: string]: unknown
}

interface ToolCallState {
  status: "pending" | "running" | "completed" | "error"
  title?: string
  input?: ToolCallInput
  output?: string
  error?: string
  metadata?: {
    todos?: TodoItemFromTool[]
    [key: string]: unknown
  }
  time?: {
    start?: number
    end?: number
  }
}

type ToolPartWithCall = {
  type: "tool"
  tool?: string
  toolName?: string
  callID?: string
  state: ToolCallState
  [key: string]: unknown
}

// Tool call handlers registry - easy to extend for new tool types
interface ToolCallHandler {
  (state: ToolCallState, message: MessageInfo): TodoItem[]
}

const toolCallHandlers: Record<string, ToolCallHandler> = {
  // Handle todowrite tool calls
  todowrite: (state, message) => {
    const todos: TodoItem[] = []
    
    // Try to get todos from metadata first, then from input
    const todoItems = state.metadata?.todos || state.input?.todos || []
    
    console.log('[todowrite handler] found', todoItems.length, 'todos')
    
    for (const item of todoItems) {
      if (item.content) {
        todos.push({
          id: `${message.id}-${todos.length}`,
          sessionID: message.sessionID,
          title: item.content,
          status: item.status || "pending",
          priority: item.priority,
          createdAt: Date.now(),
        })
      }
    }
    
    return todos
  },
  
  // Placeholder for future tool types
  // example: (state, message) => { return [] }
}

// Parse todos from message (handles both markdown and tool calls)
function parseTodosFromMessage(message: MessageInfo | undefined | null): TodoItem[] {
  if (!message || !message.id || !message.sessionID) return []
  
  const todos: TodoItem[] = []
  
  console.log('[parseTodosFromMessage] message id:', message.id, 'parts count:', message.parts?.length)

  // Handle tool call parts
  const toolParts = message.parts?.filter((p) => p.type === "tool") ?? []

  for (const part of toolParts) {
    const toolPart = part as unknown as ToolPartWithCall
    const toolName = toolPart.tool || toolPart.toolName
    console.log('[parseTodosFromMessage] tool part:', toolName, 'status:', toolPart.state?.status)

    if (toolName && toolCallHandlers[toolName]) {
      const handler = toolCallHandlers[toolName]
      const parsedTodos = handler(toolPart.state, message)
      console.log('[parseTodosFromMessage] handler parsed', parsedTodos.length, 'todos')
      todos.push(...parsedTodos)
    } else if (toolName) {
      console.log('[parseTodosFromMessage] no handler for tool:', toolName)
    }
  }

  // Handle markdown checkbox format in text parts (legacy support)
  const textParts = message.parts?.filter((p): p is TextPartData => p.type === "text") ?? []
  
  for (const part of textParts) {
    const text = part.text || ""
    
    // Match markdown checkbox format: - [ ] or - [x] or - [X]
    const todoRegex = /^\s*-\s*\[([ xX])\]\s*(.+)$/gm
    let match

    while ((match = todoRegex.exec(text)) !== null) {
      const isCompleted = match[1].toLowerCase() === "x"
      const title = match[2].trim()

      if (title) {
        todos.push({
          id: `${message.id}-${todos.length}`,
          sessionID: message.sessionID,
          title,
          status: isCompleted ? "completed" : "pending",
          createdAt: Date.now(),
        })
      }
    }
  }

  console.log('[parseTodosFromMessage] total todos found:', todos.length)
  return todos
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

    case "messages.list": {
      const sessionID = action.sessionID
      console.log('[reducer messages.list] sessionID:', sessionID)
      console.log('[reducer messages.list] messages count:', action.messages.length)
      console.log('[reducer messages.list] first message:', action.messages[0] ? JSON.stringify(action.messages[0], null, 2) : 'none')
      
      const allTodos: TodoItem[] = []
      const existingTitles = new Set<string>()
      
      for (const message of action.messages) {
        console.log('[reducer messages.list] processing message:', message.id, 'role:', message.role, 'parts count:', message.parts?.length)
        if (message.role === "assistant") {
          const parsedTodos = parseTodosFromMessage(message)
          console.log('[reducer messages.list] parsed todos from message:', message.id, '-', parsedTodos.length, 'todos')
          for (const todo of parsedTodos) {
            if (!existingTitles.has(todo.title)) {
              allTodos.push(todo)
              existingTitles.add(todo.title)
            }
          }
        }
      }
      
      console.log('[reducer messages.list] total todos:', allTodos.length)
      console.log('[reducer messages.list] allTodos:', allTodos)
      
      return {
        ...state,
        messages: { ...state.messages, [sessionID]: action.messages },
        activeSessionID: sessionID,
        todos: allTodos.length > 0 
          ? { ...state.todos, [sessionID]: allTodos }
          : state.todos,
      }
    }

    case "event": {
      const { type, properties } = action.event
      console.log("[opencode reducer] Event:", type, properties)
      switch (type) {
        case "message.updated": {
          const info = properties.info as MessageInfo | undefined
          if (!info || !info.sessionID) return state
          const sessionID = info.sessionID
          const msgs = state.messages[sessionID] ?? []
          const newState = { ...state, messages: { ...state.messages, [sessionID]: updateMessage(msgs, info) } }
          
          // Parse todos from assistant messages
          if (info.role === "assistant") {
            const parsedTodos = parseTodosFromMessage(info)
            if (parsedTodos.length > 0) {
              const existingTodos = newState.todos[sessionID] ?? []
              // Merge parsed todos with existing, avoiding duplicates by title
              const existingTitles = new Set(existingTodos.map(t => t.title))
              const newTodos = parsedTodos.filter(t => !existingTitles.has(t.title))
              newState.todos = {
                ...newState.todos,
                [sessionID]: [...existingTodos, ...newTodos]
              }
            }
          }
          
          return newState
        }
        case "message.part.updated": {
          const part = properties.part as PartData | undefined
          if (!part || !part.sessionID) return state
          const sessionID = part.sessionID
          const msgs = state.messages[sessionID] ?? []
          const newState = { ...state, messages: { ...state.messages, [sessionID]: updatePart(msgs, part) } }
          
          if (part.type === "text") {
            const textPart = part as TextPartData
            const message = newState.messages[sessionID]?.find(m => m.id === textPart.messageID)
            if (message && message.role === "assistant") {
              const parsedTodos = parseTodosFromMessage(message)
              if (parsedTodos.length > 0) {
                const existingTodos = newState.todos[sessionID] ?? []
                const existingTitles = new Set(existingTodos.map(t => t.title))
                const newTodos = parsedTodos.filter(t => !existingTitles.has(t.title))
                newState.todos = {
                  ...newState.todos,
                  [sessionID]: [...existingTodos, ...newTodos]
                }
              }
            }
          }
          
          return newState
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
          const { sessionID, status } = properties as { sessionID: string; status: SessionStatus | { type: SessionStatus } }
          // Handle both string status and object { type: status }
          const statusValue: SessionStatus = typeof status === 'string' ? status : (status as { type: SessionStatus }).type
          return { ...state, sessionStatuses: { ...state.sessionStatuses, [sessionID]: statusValue } }
        }
        case "session.updated": {
          const info = properties.info as SessionInfo
          const sessions = state.sessions.map((s) => (s.id === info.id ? info : s))
          return { ...state, sessions }
        }
        case "session.diff": {
          const { sessionID, diff } = properties as { sessionID: string; diff: FileDiff[] }
          return {
            ...state,
            fileChanges: {
              ...state.fileChanges,
              [sessionID]: diff,
            },
          }
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

    case "commands.list":
      return {
        ...state,
        commands: action.commands,
      }

    case "agents.list":
      return {
        ...state,
        agents: action.agents,
      }

    case "providers.list": {
      // Filter to only show configured (connected) providers
      const connectedProviders = action.connected
        ? action.providers.filter((p) => action.connected!.includes(p.id))
        : action.providers

      return {
        ...state,
        providers: connectedProviders,
      }
    }

    case "config.get": {
      // Set default model and agent from user config if not already selected
      let selectedModel = state.selectedModel
      let selectedAgent = state.selectedAgent
      
      if (!selectedModel && action.config.model) {
        // Parse model format: "provider/model" or "provider:model"
        const modelStr = action.config.model
        if (modelStr.includes('/')) {
          const [providerId, modelId] = modelStr.split('/')
          selectedModel = `${providerId}:${modelId}`
        } else if (modelStr.includes(':')) {
          selectedModel = modelStr
        }
      }
      
      if (!selectedAgent && action.config.default_agent) {
        selectedAgent = action.config.default_agent
      }
      
      return {
        ...state,
        selectedModel,
        selectedAgent,
      }
    }

    case "agent.select":
      return {
        ...state,
        selectedAgent: action.agentID,
      }

    case "model.select":
      return {
        ...state,
        selectedModel: action.modelID,
      }

    case "session.diff":
      return {
        ...state,
        fileChanges: {
          ...state.fileChanges,
          [action.sessionID]: action.diffs,
        },
      }

    default:
      return state
  }
}
