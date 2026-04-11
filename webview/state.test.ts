import { describe, it, expect } from "vitest"
import { reducer, initialState, type AppState, type Action } from "./state"
import type {
  SessionInfo,
  MessageInfo,
  CommandInfo,
  ProviderInfo,
  AgentInfo,
  FileDiff,
  PermissionRequest,
  QuestionRequest,
  SseEvent,
} from "./types"

describe("reducer", () => {
  describe("server actions", () => {
    it("handles server.ready", () => {
      const state: AppState = { ...initialState, connected: false, serverError: "error" }
      const action: Action = { type: "server.ready" }
      const result = reducer(state, action)

      expect(result.connected).toBe(true)
      expect(result.serverError).toBeNull()
    })

    it("handles server.error", () => {
      const state: AppState = { ...initialState, connected: true }
      const action: Action = { type: "server.error", message: "Connection failed" }
      const result = reducer(state, action)

      expect(result.connected).toBe(false)
      expect(result.serverError).toBe("Connection failed")
    })
  })

  describe("workspace actions", () => {
    it("handles workspace.missing", () => {
      const state: AppState = { ...initialState, workspaceMissing: false }
      const action: Action = { type: "workspace.missing" }
      const result = reducer(state, action)

      expect(result.workspaceMissing).toBe(true)
    })
  })

  describe("session actions", () => {
    it("handles sessions.list", () => {
      const sessions: SessionInfo[] = [
        { id: "s1", title: "Session 1", directory: "/path", time: { created: 1, updated: 1 } },
      ]
      const action: Action = { type: "sessions.list", sessions }
      const result = reducer(initialState, action)

      expect(result.sessions).toEqual(sessions)
    })

    it("handles session.created", () => {
      const existingSession: SessionInfo = {
        id: "s1",
        title: "Old Session",
        directory: "/path",
        time: { created: 1, updated: 1 },
      }
      const state: AppState = { ...initialState, sessions: [existingSession] }
      const newSession: SessionInfo = {
        id: "s1",
        title: "New Session",
        directory: "/path",
        time: { created: 2, updated: 2 },
      }
      const action: Action = { type: "session.created", session: newSession }
      const result = reducer(state, action)

      expect(result.sessions).toHaveLength(1)
      expect(result.sessions[0].title).toBe("New Session")
      expect(result.activeSessionID).toBe("s1")
    })

    it("handles session.created with new session", () => {
      const existingSession: SessionInfo = {
        id: "s1",
        title: "Session 1",
        directory: "/path",
        time: { created: 1, updated: 1 },
      }
      const state: AppState = { ...initialState, sessions: [existingSession] }
      const newSession: SessionInfo = {
        id: "s2",
        title: "Session 2",
        directory: "/path",
        time: { created: 2, updated: 2 },
      }
      const action: Action = { type: "session.created", session: newSession }
      const result = reducer(state, action)

      expect(result.sessions).toHaveLength(2)
      expect(result.activeSessionID).toBe("s2")
    })

    it("handles session.deleted", () => {
      const sessions: SessionInfo[] = [
        { id: "s1", title: "Session 1", directory: "/path", time: { created: 1, updated: 1 } },
        { id: "s2", title: "Session 2", directory: "/path", time: { created: 2, updated: 2 } },
      ]
      const state: AppState = { ...initialState, sessions, activeSessionID: "s1" }
      const action: Action = { type: "session.deleted", sessionID: "s1" }
      const result = reducer(state, action)

      expect(result.sessions).toHaveLength(1)
      expect(result.sessions[0].id).toBe("s2")
      expect(result.activeSessionID).toBeNull()
    })

    it("handles session.deleted for non-active session", () => {
      const sessions: SessionInfo[] = [
        { id: "s1", title: "Session 1", directory: "/path", time: { created: 1, updated: 1 } },
        { id: "s2", title: "Session 2", directory: "/path", time: { created: 2, updated: 2 } },
      ]
      const state: AppState = { ...initialState, sessions, activeSessionID: "s1" }
      const action: Action = { type: "session.deleted", sessionID: "s2" }
      const result = reducer(state, action)

      expect(result.sessions).toHaveLength(1)
      expect(result.activeSessionID).toBe("s1")
    })
  })

  describe("message actions", () => {
    it("handles messages.list", () => {
      const messages: MessageInfo[] = [
        {
          id: "m1",
          sessionID: "s1",
          role: "user",
          parts: [],
          time: { created: 1 },
        },
      ]
      const action: Action = { type: "messages.list", sessionID: "s1", messages }
      const result = reducer(initialState, action)

      expect(result.messages["s1"]).toEqual(messages)
      expect(result.activeSessionID).toBe("s1")
    })
  })

  describe("context actions", () => {
    it("handles context.resolved for selection", () => {
      const payload = { text: "selected code", file: "test.ts", range: "1-5" }
      const action: Action = { type: "context.resolved", kind: "selection", payload }
      const result = reducer(initialState, action)

      expect(result.contextResolved.selection).toEqual(payload)
    })

    it("handles context.resolved for problems", () => {
      const payload = [{ file: "test.ts", line: 1, severity: "error", message: "Error" }]
      const action: Action = { type: "context.resolved", kind: "problems", payload }
      const result = reducer(initialState, action)

      expect(result.contextResolved.problems).toEqual(payload)
    })

    it("handles context.resolved for terminal", () => {
      const payload = "terminal output"
      const action: Action = { type: "context.resolved", kind: "terminal", payload }
      const result = reducer(initialState, action)

      expect(result.contextResolved.terminal).toBe(payload)
    })

    it("handles context.resolved for files", () => {
      const payload = [{ path: "test.ts" }]
      const action: Action = { type: "context.resolved", kind: "files", payload }
      const result = reducer(initialState, action)

      expect(result.contextResolved.files).toEqual(payload)
    })
  })

  describe("command actions", () => {
    it("handles commands.list", () => {
      const commands: CommandInfo[] = [
        { id: "cmd1", name: "Test Command", description: "Test" },
      ]
      const action: Action = { type: "commands.list", commands }
      const result = reducer(initialState, action)

      expect(result.commands).toEqual(commands)
    })
  })

  describe("config actions", () => {
    it("handles config.get with model containing slash", () => {
      const action: Action = {
        type: "config.get",
        config: { model: "openai/gpt-4", default_agent: "test-agent" },
      }
      const result = reducer(initialState, action)

      expect(result.selectedModel).toBe("openai:gpt-4")
      expect(result.selectedAgent).toBe("test-agent")
    })

    it("handles config.get with model containing colon", () => {
      const action: Action = {
        type: "config.get",
        config: { model: "anthropic:claude-3" },
      }
      const result = reducer(initialState, action)

      expect(result.selectedModel).toBe("anthropic:claude-3")
    })

    it("handles config.get without model", () => {
      const action: Action = { type: "config.get", config: {} }
      const result = reducer(initialState, action)

      expect(result.selectedModel).toBeNull()
    })

    it("preserves existing selections", () => {
      const state: AppState = { ...initialState, selectedModel: "existing:model" }
      const action: Action = { type: "config.get", config: { model: "new:model" } }
      const result = reducer(state, action)

      expect(result.selectedModel).toBe("existing:model")
    })
  })

  describe("provider actions", () => {
    it("handles providers.list with connected filter", () => {
      const providers: ProviderInfo[] = [
        { id: "p1", name: "Provider 1" },
        { id: "p2", name: "Provider 2" },
        { id: "p3", name: "Provider 3" },
      ]
      const action: Action = {
        type: "providers.list",
        providers,
        connected: ["p1", "p3"],
      }
      const result = reducer(initialState, action)

      expect(result.providers).toHaveLength(2)
      expect(result.providers[0].id).toBe("p1")
      expect(result.providers[1].id).toBe("p3")
    })

    it("handles providers.list without connected filter", () => {
      const providers: ProviderInfo[] = [
        { id: "p1", name: "Provider 1" },
        { id: "p2", name: "Provider 2" },
      ]
      const action: Action = { type: "providers.list", providers }
      const result = reducer(initialState, action)

      expect(result.providers).toHaveLength(2)
    })
  })

  describe("agent actions", () => {
    it("handles agents.list", () => {
      const agents: AgentInfo[] = [
        { name: "agent1", description: "Test Agent", mode: "primary", builtIn: true },
      ]
      const action: Action = { type: "agents.list", agents }
      const result = reducer(initialState, action)

      expect(result.agents).toEqual(agents)
    })

    it("handles agent.select", () => {
      const action: Action = { type: "agent.select", agentID: "agent1" }
      const result = reducer(initialState, action)

      expect(result.selectedAgent).toBe("agent1")
    })

    it("handles agent.select with null", () => {
      const state: AppState = { ...initialState, selectedAgent: "agent1" }
      const action: Action = { type: "agent.select", agentID: null }
      const result = reducer(state, action)

      expect(result.selectedAgent).toBeNull()
    })
  })

  describe("model actions", () => {
    it("handles model.select", () => {
      const action: Action = { type: "model.select", modelID: "model1" }
      const result = reducer(initialState, action)

      expect(result.selectedModel).toBe("model1")
    })

    it("handles model.select with null", () => {
      const state: AppState = { ...initialState, selectedModel: "model1" }
      const action: Action = { type: "model.select", modelID: null }
      const result = reducer(state, action)

      expect(result.selectedModel).toBeNull()
    })
  })

  describe("diff actions", () => {
    it("handles session.diff", () => {
      const diffs: FileDiff[] = [
        { file: "test.ts", before: "old", after: "new", additions: 1, deletions: 1 },
      ]
      const action: Action = { type: "session.diff", sessionID: "s1", diffs }
      const result = reducer(initialState, action)

      expect(result.fileChanges["s1"]).toEqual(diffs)
    })

    it("handles session.diff replacing existing diffs", () => {
      const oldDiffs: FileDiff[] = [
        { file: "old.ts", before: "old", after: "new", additions: 1, deletions: 1 },
      ]
      const state: AppState = { ...initialState, fileChanges: { s1: oldDiffs } }
      const newDiffs: FileDiff[] = [
        { file: "new.ts", before: "old", after: "new", additions: 2, deletions: 2 },
      ]
      const action: Action = { type: "session.diff", sessionID: "s1", diffs: newDiffs }
      const result = reducer(state, action)

      expect(result.fileChanges["s1"]).toEqual(newDiffs)
    })
  })

  describe("event actions", () => {
    it("handles message.updated event", () => {
      const existingMessage: MessageInfo = {
        id: "m1",
        sessionID: "s1",
        role: "assistant",
        parts: [],
        time: { created: 1 },
      }
      const state: AppState = {
        ...initialState,
        messages: { s1: [existingMessage] },
      }
      const updatedMessage: MessageInfo = {
        id: "m1",
        sessionID: "s1",
        role: "assistant",
        parts: [{ id: "p1", sessionID: "s1", messageID: "m1", type: "text", text: "Hello" }],
        time: { created: 1, completed: 2 },
      }
      const event: SseEvent = {
        type: "message.updated",
        properties: { info: updatedMessage },
      }
      const action: Action = { type: "event", event }
      const result = reducer(state, action)

      expect(result.messages["s1"][0].parts).toHaveLength(1)
      expect(result.messages["s1"][0].time.completed).toBe(2)
    })

    it("handles permission.asked event", () => {
      const event: SseEvent = {
        type: "permission.asked",
        properties: {
          id: "perm1",
          type: "command",
          metadata: { command: "git.commit", description: "Commit changes" },
        },
      }
      const action: Action = { type: "event", event }
      const result = reducer(initialState, action)

      expect(result.permissions).toHaveLength(1)
      expect(result.permissions[0].requestID).toBe("perm1")
      expect(result.permissions[0].command).toBe("git.commit")
    })

    it("handles permission.replied event", () => {
      const existingPermission: PermissionRequest = {
        requestID: "perm1",
        type: "command",
        command: "git.commit",
      }
      const state: AppState = {
        ...initialState,
        permissions: [existingPermission],
      }
      const event: SseEvent = {
        type: "permission.replied",
        properties: { id: "perm1" },
      }
      const action: Action = { type: "event", event }
      const result = reducer(state, action)

      expect(result.permissions).toHaveLength(0)
    })

    it("handles question.asked event", () => {
      const event: SseEvent = {
        type: "question.asked",
        properties: { id: "q1", message: "Continue?", options: ["Yes", "No"] },
      }
      const action: Action = { type: "event", event }
      const result = reducer(initialState, action)

      expect(result.questions).toHaveLength(1)
      expect(result.questions[0].question).toBe("Continue?")
      expect(result.questions[0].options).toEqual(["Yes", "No"])
    })

    it("handles question.answered event", () => {
      const existingQuestion: QuestionRequest = {
        requestID: "q1",
        question: "Continue?",
      }
      const state: AppState = {
        ...initialState,
        questions: [existingQuestion],
      }
      const event: SseEvent = {
        type: "question.answered",
        properties: { id: "q1" },
      }
      const action: Action = { type: "event", event }
      const result = reducer(state, action)

      expect(result.questions).toHaveLength(0)
    })

    it("handles session.status event with string status", () => {
      const event: SseEvent = {
        type: "session.status",
        properties: { sessionID: "s1", status: "busy" },
      }
      const action: Action = { type: "event", event }
      const result = reducer(initialState, action)

      expect(result.sessionStatuses["s1"]).toBe("busy")
    })

    it("handles session.status event with object status", () => {
      const event: SseEvent = {
        type: "session.status",
        properties: { sessionID: "s1", status: { type: "error" } },
      }
      const action: Action = { type: "event", event }
      const result = reducer(initialState, action)

      expect(result.sessionStatuses["s1"]).toBe("error")
    })

    it("handles session.updated event", () => {
      const existingSession: SessionInfo = {
        id: "s1",
        title: "Old Title",
        directory: "/path",
        time: { created: 1, updated: 1 },
      }
      const state: AppState = {
        ...initialState,
        sessions: [existingSession],
      }
      const updatedSession: SessionInfo = {
        id: "s1",
        title: "New Title",
        directory: "/path",
        time: { created: 1, updated: 2 },
      }
      const event: SseEvent = {
        type: "session.updated",
        properties: { info: updatedSession },
      }
      const action: Action = { type: "event", event }
      const result = reducer(state, action)

      expect(result.sessions[0].title).toBe("New Title")
    })

    it("handles unknown event type", () => {
      const event: SseEvent = {
        type: "unknown.event",
        properties: {},
      }
      const action: Action = { type: "event", event }
      const result = reducer(initialState, action)

      expect(result).toEqual(initialState)
    })
  })

  describe("unknown action", () => {
    it("returns state unchanged for unknown action type", () => {
      const action = { type: "unknown.action" } as unknown as Action
      const result = reducer(initialState, action)

      expect(result).toEqual(initialState)
    })
  })
})

describe("initialState", () => {
  it("has correct default values", () => {
    expect(initialState.connected).toBe(false)
    expect(initialState.serverError).toBeNull()
    expect(initialState.workspaceMissing).toBe(false)
    expect(initialState.sessions).toEqual([])
    expect(initialState.activeSessionID).toBeNull()
    expect(initialState.messages).toEqual({})
    expect(initialState.partDeltas).toEqual({})
    expect(initialState.permissions).toEqual([])
    expect(initialState.questions).toEqual([])
    expect(initialState.sessionStatuses).toEqual({})
    expect(initialState.commands).toEqual([])
    expect(initialState.contextResolved).toEqual({})
    expect(initialState.agents).toEqual([])
    expect(initialState.providers).toEqual([])
    expect(initialState.selectedAgent).toBeNull()
    expect(initialState.selectedModel).toBeNull()
    expect(initialState.fileChanges).toEqual({})
    expect(initialState.todos).toEqual({})
  })
})
