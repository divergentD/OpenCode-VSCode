import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  parseTodosFromMessage,
  extractTodosFromMessages,
  mergeTodos,
} from "./todos"
import type { MessageInfo, TextPartData, TodoItem } from "../types"

describe("parseTodosFromMessage", () => {
  it("returns empty array for null/undefined message", () => {
    expect(parseTodosFromMessage(null)).toEqual([])
    expect(parseTodosFromMessage(undefined)).toEqual([])
  })

  it("returns empty array for message without id or sessionID", () => {
    expect(parseTodosFromMessage({} as MessageInfo)).toEqual([])
    expect(parseTodosFromMessage({ id: "1" } as MessageInfo)).toEqual([])
    expect(parseTodosFromMessage({ sessionID: "s1" } as MessageInfo)).toEqual([])
  })

  it("parses markdown checkboxes from text parts", () => {
    const message: MessageInfo = {
      id: "msg1",
      sessionID: "s1",
      role: "assistant",
      parts: [
        {
          id: "p1",
          sessionID: "s1",
          messageID: "msg1",
          type: "text",
          text: "- [ ] Task 1\n- [x] Task 2\n- [X] Task 3",
        } as TextPartData,
      ],
      time: { created: Date.now() },
    }

    const todos = parseTodosFromMessage(message)

    expect(todos).toHaveLength(3)
    expect(todos[0].title).toBe("Task 1")
    expect(todos[0].status).toBe("pending")
    expect(todos[1].title).toBe("Task 2")
    expect(todos[1].status).toBe("completed")
    expect(todos[2].title).toBe("Task 3")
    expect(todos[2].status).toBe("completed")
  })

  it("ignores invalid markdown checkboxes", () => {
    const message: MessageInfo = {
      id: "msg1",
      sessionID: "s1",
      role: "assistant",
      parts: [
        {
          id: "p1",
          sessionID: "s1",
          messageID: "msg1",
          type: "text",
          text: "- [ ] Valid task\n- [ ]\nRegular text",
        } as TextPartData,
      ],
      time: { created: Date.now() },
    }

    const todos = parseTodosFromMessage(message)

    expect(todos).toHaveLength(1)
    expect(todos[0].title).toBe("Valid task")
  })

  it("handles empty text parts", () => {
    const message: MessageInfo = {
      id: "msg1",
      sessionID: "s1",
      role: "assistant",
      parts: [
        {
          id: "p1",
          sessionID: "s1",
          messageID: "msg1",
          type: "text",
          text: "",
        } as TextPartData,
      ],
      time: { created: Date.now() },
    }

    expect(parseTodosFromMessage(message)).toEqual([])
  })

  it("parses todos from todowrite tool calls", () => {
    const message: MessageInfo = {
      id: "msg1",
      sessionID: "s1",
      role: "assistant",
      parts: [
        {
          id: "p1",
          sessionID: "s1",
          messageID: "msg1",
          type: "tool",
          tool: "todowrite",
          toolName: "todowrite",
          state: {
            status: "completed",
            input: {
              todos: [
                { content: "Tool task 1", status: "pending" },
                { content: "Tool task 2", status: "in_progress", priority: "high" },
              ],
            },
          },
        },
      ],
      time: { created: Date.now() },
    }

    const todos = parseTodosFromMessage(message)

    expect(todos).toHaveLength(2)
    expect(todos[0].title).toBe("Tool task 1")
    expect(todos[0].status).toBe("pending")
    expect(todos[1].title).toBe("Tool task 2")
    expect(todos[1].status).toBe("in_progress")
    expect(todos[1].priority).toBe("high")
  })

  it("parses todos from todowrite metadata", () => {
    const message: MessageInfo = {
      id: "msg1",
      sessionID: "s1",
      role: "assistant",
      parts: [
        {
          id: "p1",
          sessionID: "s1",
          messageID: "msg1",
          type: "tool",
          tool: "todowrite",
          state: {
            status: "completed",
            metadata: {
              todos: [{ content: "Metadata task", status: "completed" }],
            },
          },
        },
      ],
      time: { created: Date.now() },
    }

    const todos = parseTodosFromMessage(message)

    expect(todos).toHaveLength(1)
    expect(todos[0].title).toBe("Metadata task")
  })

  it("prefers metadata over input for todowrite", () => {
    const message: MessageInfo = {
      id: "msg1",
      sessionID: "s1",
      role: "assistant",
      parts: [
        {
          id: "p1",
          sessionID: "s1",
          messageID: "msg1",
          type: "tool",
          tool: "todowrite",
          state: {
            status: "completed",
            input: {
              todos: [{ content: "Input task", status: "pending" }],
            },
            metadata: {
              todos: [{ content: "Metadata task", status: "completed" }],
            },
          },
        },
      ],
      time: { created: Date.now() },
    }

    const todos = parseTodosFromMessage(message)

    expect(todos).toHaveLength(1)
    expect(todos[0].title).toBe("Metadata task")
  })

  it("combines todos from both markdown and tool calls", () => {
    const message: MessageInfo = {
      id: "msg1",
      sessionID: "s1",
      role: "assistant",
      parts: [
        {
          id: "p1",
          sessionID: "s1",
          messageID: "msg1",
          type: "tool",
          tool: "todowrite",
          state: {
            status: "completed",
            metadata: {
              todos: [{ content: "Tool task", status: "pending" }],
            },
          },
        },
        {
          id: "p2",
          sessionID: "s1",
          messageID: "msg1",
          type: "text",
          text: "- [ ] Markdown task",
        } as TextPartData,
      ],
      time: { created: Date.now() },
    }

    const todos = parseTodosFromMessage(message)

    expect(todos).toHaveLength(2)
    expect(todos[0].title).toBe("Tool task")
    expect(todos[1].title).toBe("Markdown task")
  })

  it("handles unknown tool types gracefully", () => {
    const message: MessageInfo = {
      id: "msg1",
      sessionID: "s1",
      role: "assistant",
      parts: [
        {
          id: "p1",
          sessionID: "s1",
          messageID: "msg1",
          type: "tool",
          tool: "unknown",
          state: { status: "completed" },
        },
      ],
      time: { created: Date.now() },
    }

    expect(parseTodosFromMessage(message)).toEqual([])
  })
})

describe("extractTodosFromMessages", () => {
  it("returns empty array for empty messages", () => {
    expect(extractTodosFromMessages([])).toEqual([])
  })

  it("only processes assistant messages", () => {
    const messages: MessageInfo[] = [
      {
        id: "msg1",
        sessionID: "s1",
        role: "user",
        parts: [{ id: "p1", sessionID: "s1", messageID: "msg1", type: "text", text: "- [ ] User task" } as TextPartData],
        time: { created: Date.now() },
      },
      {
        id: "msg2",
        sessionID: "s1",
        role: "assistant",
        parts: [{ id: "p1", sessionID: "s1", messageID: "msg2", type: "text", text: "- [ ] Assistant task" } as TextPartData],
        time: { created: Date.now() },
      },
    ]

    const todos = extractTodosFromMessages(messages)

    expect(todos).toHaveLength(1)
    expect(todos[0].title).toBe("Assistant task")
  })

  it("deduplicates todos by title", () => {
    const messages: MessageInfo[] = [
      {
        id: "msg1",
        sessionID: "s1",
        role: "assistant",
        parts: [{ id: "p1", sessionID: "s1", messageID: "msg1", type: "text", text: "- [ ] Same task" } as TextPartData],
        time: { created: Date.now() },
      },
      {
        id: "msg2",
        sessionID: "s1",
        role: "assistant",
        parts: [{ id: "p1", sessionID: "s1", messageID: "msg2", type: "text", text: "- [ ] Same task" } as TextPartData],
        time: { created: Date.now() },
      },
    ]

    const todos = extractTodosFromMessages(messages)

    expect(todos).toHaveLength(1)
    expect(todos[0].title).toBe("Same task")
  })
})

describe("mergeTodos", () => {
  it("returns new todos when existing is empty", () => {
    const newTodos: TodoItem[] = [
      { id: "1", sessionID: "s1", title: "Task 1", status: "pending", createdAt: Date.now() },
    ]

    expect(mergeTodos([], newTodos)).toEqual(newTodos)
  })

  it("returns existing when new is empty", () => {
    const existing: TodoItem[] = [
      { id: "1", sessionID: "s1", title: "Task 1", status: "pending", createdAt: Date.now() },
    ]

    expect(mergeTodos(existing, [])).toEqual(existing)
  })

  it("merges unique todos", () => {
    const existing: TodoItem[] = [
      { id: "1", sessionID: "s1", title: "Existing", status: "pending", createdAt: Date.now() },
    ]
    const newTodos: TodoItem[] = [
      { id: "2", sessionID: "s1", title: "New", status: "in_progress", createdAt: Date.now() },
    ]

    const result = mergeTodos(existing, newTodos)

    expect(result).toHaveLength(2)
    expect(result[0].title).toBe("Existing")
    expect(result[1].title).toBe("New")
  })

  it("skips duplicates by title", () => {
    const existing: TodoItem[] = [
      { id: "1", sessionID: "s1", title: "Duplicate", status: "pending", createdAt: Date.now() },
    ]
    const newTodos: TodoItem[] = [
      { id: "2", sessionID: "s1", title: "Duplicate", status: "completed", createdAt: Date.now() },
    ]

    const result = mergeTodos(existing, newTodos)

    expect(result).toHaveLength(1)
    expect(result[0].status).toBe("pending")
  })
})
