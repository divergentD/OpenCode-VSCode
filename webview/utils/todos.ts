import type { MessageInfo, TextPartData, TodoItem } from "../types"

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

type ToolCallHandler = (state: ToolCallState, message: MessageInfo) => TodoItem[]

const todoWriteHandler: ToolCallHandler = (state, message) => {
  const todos: TodoItem[] = []
  const todoItems = state.metadata?.todos || state.input?.todos || []

  console.log("[todowrite handler] found", todoItems.length, "todos")

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
}

const toolCallHandlers: Record<string, ToolCallHandler> = {
  todowrite: todoWriteHandler,
}

export function parseTodosFromMessage(message: MessageInfo | undefined | null): TodoItem[] {
  if (!message || !message.id || !message.sessionID) return []

  const todos: TodoItem[] = []

  console.log(
    "[parseTodosFromMessage] message id:",
    message.id,
    "parts count:",
    message.parts?.length
  )

  const toolParts = message.parts?.filter((p) => p.type === "tool") ?? []

  for (const part of toolParts) {
    const toolPart = part as unknown as ToolPartWithCall
    const toolName = toolPart.tool || toolPart.toolName
    console.log(
      "[parseTodosFromMessage] tool part:",
      toolName,
      "status:",
      toolPart.state?.status
    )

    if (toolName && toolCallHandlers[toolName]) {
      const handler = toolCallHandlers[toolName]
      const parsedTodos = handler(toolPart.state, message)
      console.log("[parseTodosFromMessage] handler parsed", parsedTodos.length, "todos")
      todos.push(...parsedTodos)
    } else if (toolName) {
      console.log("[parseTodosFromMessage] no handler for tool:", toolName)
    }
  }

  const textParts = message.parts?.filter((p): p is TextPartData => p.type === "text") ?? []

  for (const part of textParts) {
    const text = part.text || ""
    const lines = text.split("\n")

    for (const line of lines) {
      const match = line.match(/^\s*-\s*\[([ xX])\]\s*(.+)$/)
      if (match) {
        const isCompleted = match[1].toLowerCase() === "x"
        const title = match[2].trim()

        if (title.length > 0) {
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
  }

  console.log("[parseTodosFromMessage] total todos found:", todos.length)
  return todos
}

export function extractTodosFromMessages(messages: MessageInfo[]): TodoItem[] {
  const allTodos: TodoItem[] = []
  const existingTitles = new Set<string>()

  for (const message of messages) {
    if (message.role === "assistant") {
      const parsedTodos = parseTodosFromMessage(message)
      for (const todo of parsedTodos) {
        if (!existingTitles.has(todo.title)) {
          allTodos.push(todo)
          existingTitles.add(todo.title)
        }
      }
    }
  }

  return allTodos
}

export function mergeTodos(existing: TodoItem[], newTodos: TodoItem[]): TodoItem[] {
  const existingTitles = new Set(existing.map((t) => t.title))
  const uniqueNewTodos = newTodos.filter((t) => !existingTitles.has(t.title))
  return [...existing, ...uniqueNewTodos]
}
