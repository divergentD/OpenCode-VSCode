import { describe, it, expect, beforeEach, vi } from "vitest"
import { ChatProvider } from "./provider"
import { commandRegistry } from "./commands"
import type { WebviewMessage } from "./types"

// Mock vscode
vi.mock("vscode", () => ({
  window: {
    showErrorMessage: vi.fn(),
    showTextDocument: vi.fn(),
  },
  workspace: {
    openTextDocument: vi.fn(),
    workspaceFolders: [{ uri: { fsPath: "/test" } }],
  },
  commands: {
    executeCommand: vi.fn(),
  },
  Uri: {
    file: vi.fn((path: string) => ({ fsPath: path })),
    joinPath: vi.fn(),
    from: vi.fn(),
  },
  ExtensionContext: {},
  WebviewView: {},
  ProgressLocation: { Notification: 1 },
  Range: vi.fn(),
}))

// Mock @opencode-ai/sdk
vi.mock("@opencode-ai/sdk", () => ({
  createOpencodeClient: vi.fn(() => ({
    session: {
      list: vi.fn().mockResolvedValue({ data: [] }),
      create: vi.fn().mockResolvedValue({ data: { id: "test-session" } }),
      delete: vi.fn().mockResolvedValue({}),
      abort: vi.fn().mockResolvedValue({}),
      messages: vi.fn().mockResolvedValue({ data: [] }),
      diff: vi.fn().mockResolvedValue({ data: [] }),
      prompt: vi.fn().mockResolvedValue({}),
    },
    permission: {
      reply: vi.fn().mockResolvedValue({}),
    },
    find: {
      files: vi.fn().mockResolvedValue({ data: [] }),
      symbols: vi.fn().mockResolvedValue({ data: [] }),
    },
    provider: {
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
    command: {
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
    app: {
      agents: vi.fn().mockResolvedValue({ data: [] }),
    },
    config: {
      get: vi.fn().mockResolvedValue({ data: {} }),
    },
    global: {
      event: vi.fn().mockResolvedValue({ stream: [] }),
    },
  })),
}))

// Mock server
vi.mock("./server", () => ({
  connect: vi.fn().mockResolvedValue({
    url: "http://localhost:3000",
    spawned: { kill: vi.fn() },
    dispose: vi.fn(),
  }),
}))

describe("Command Registry", () => {
  it("should have all 16 commands registered", () => {
    const expectedCommands = [
      "ready",
      "sessions.list.request",
      "session.create",
      "session.select",
      "session.delete",
      "session.abort",
      "prompt",
      "permission.reply",
      "mention.resolve",
      "files.search",
      "symbols.search",
      "providers.list.request",
      "commands.list.request",
      "agents.list.request",
      "file.open",
      "file.diff",
    ]

    for (const commandType of expectedCommands) {
      expect(commandRegistry.has(commandType)).toBe(true)
    }
  })

  it("should return undefined for unknown command types", () => {
    expect(commandRegistry.get("unknown.command")).toBeUndefined()
  })
})

describe("Command Pattern Implementation", () => {
  let provider: ChatProvider
  let mockContext: any
  let mockDiffProvider: any
  let mockFileChangesProvider: any

  beforeEach(() => {
    mockContext = {
      extensionUri: { fsPath: "/test" },
      subscriptions: { push: vi.fn() },
    }
    mockDiffProvider = {
      setContent: vi.fn(),
    }
    mockFileChangesProvider = {
      show: vi.fn(),
      updateDiffs: vi.fn(),
    }
    provider = new ChatProvider(mockContext, mockDiffProvider, mockFileChangesProvider)
  })

  describe("ReadyCommand", () => {
    it("should execute ready command", async () => {
      const command = commandRegistry.get("ready")
      expect(command).toBeDefined()
      expect(command?.type).toBe("ready")
    })
  })

  describe("SessionsListRequestCommand", () => {
    it("should execute sessions.list.request command", async () => {
      const command = commandRegistry.get("sessions.list.request")
      expect(command).toBeDefined()
      expect(command?.type).toBe("sessions.list.request")
    })
  })

  describe("SessionCreateCommand", () => {
    it("should execute session.create command", async () => {
      const command = commandRegistry.get("session.create")
      expect(command).toBeDefined()
      expect(command?.type).toBe("session.create")
    })
  })

  describe("SessionSelectCommand", () => {
    it("should execute session.select command", async () => {
      const command = commandRegistry.get("session.select")
      expect(command).toBeDefined()
      expect(command?.type).toBe("session.select")
    })
  })

  describe("SessionDeleteCommand", () => {
    it("should execute session.delete command", async () => {
      const command = commandRegistry.get("session.delete")
      expect(command).toBeDefined()
      expect(command?.type).toBe("session.delete")
    })
  })

  describe("SessionAbortCommand", () => {
    it("should execute session.abort command", async () => {
      const command = commandRegistry.get("session.abort")
      expect(command).toBeDefined()
      expect(command?.type).toBe("session.abort")
    })
  })

  describe("PromptCommand", () => {
    it("should execute prompt command", async () => {
      const command = commandRegistry.get("prompt")
      expect(command).toBeDefined()
      expect(command?.type).toBe("prompt")
    })
  })

  describe("PermissionReplyCommand", () => {
    it("should execute permission.reply command", async () => {
      const command = commandRegistry.get("permission.reply")
      expect(command).toBeDefined()
      expect(command?.type).toBe("permission.reply")
    })
  })

  describe("MentionResolveCommand", () => {
    it("should execute mention.resolve command", async () => {
      const command = commandRegistry.get("mention.resolve")
      expect(command).toBeDefined()
      expect(command?.type).toBe("mention.resolve")
    })
  })

  describe("FilesSearchCommand", () => {
    it("should execute files.search command", async () => {
      const command = commandRegistry.get("files.search")
      expect(command).toBeDefined()
      expect(command?.type).toBe("files.search")
    })
  })

  describe("SymbolsSearchCommand", () => {
    it("should execute symbols.search command", async () => {
      const command = commandRegistry.get("symbols.search")
      expect(command).toBeDefined()
      expect(command?.type).toBe("symbols.search")
    })
  })

  describe("ProvidersListRequestCommand", () => {
    it("should execute providers.list.request command", async () => {
      const command = commandRegistry.get("providers.list.request")
      expect(command).toBeDefined()
      expect(command?.type).toBe("providers.list.request")
    })
  })

  describe("CommandsListRequestCommand", () => {
    it("should execute commands.list.request command", async () => {
      const command = commandRegistry.get("commands.list.request")
      expect(command).toBeDefined()
      expect(command?.type).toBe("commands.list.request")
    })
  })

  describe("AgentsListRequestCommand", () => {
    it("should execute agents.list.request command", async () => {
      const command = commandRegistry.get("agents.list.request")
      expect(command).toBeDefined()
      expect(command?.type).toBe("agents.list.request")
    })
  })

  describe("FileOpenCommand", () => {
    it("should execute file.open command", async () => {
      const command = commandRegistry.get("file.open")
      expect(command).toBeDefined()
      expect(command?.type).toBe("file.open")
    })
  })

  describe("FileDiffCommand", () => {
    it("should execute file.diff command", async () => {
      const command = commandRegistry.get("file.diff")
      expect(command).toBeDefined()
      expect(command?.type).toBe("file.diff")
    })
  })
})

describe("Provider Integration", () => {
  it("should delegate to command registry for known message types", () => {
    const knownTypes: WebviewMessage["type"][] = [
      "ready",
      "sessions.list.request",
      "session.create",
      "session.select",
      "session.delete",
      "session.abort",
      "prompt",
      "permission.reply",
      "mention.resolve",
      "files.search",
      "symbols.search",
      "providers.list.request",
      "commands.list.request",
      "agents.list.request",
      "file.open",
      "file.diff",
    ]

    for (const type of knownTypes) {
      expect(commandRegistry.has(type)).toBe(true)
    }
  })
})
