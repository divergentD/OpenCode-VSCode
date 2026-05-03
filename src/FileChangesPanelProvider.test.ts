import { describe, it, expect, vi, beforeEach } from "vitest"
import * as vscode from "vscode"
import { FileChangesPanelProvider } from "./FileChangesPanelProvider"
import { DiffContentProvider } from "./diffProvider"
import { messageHandlers } from "./handlers"

vi.mock("vscode", () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: "/workspace" } }],
    openTextDocument: vi.fn(),
  },
  window: {
    showTextDocument: vi.fn(),
    showErrorMessage: vi.fn(),
    onDidChangeActiveColorTheme: vi.fn(() => ({ dispose: vi.fn() })),
    activeColorTheme: { kind: 2 },
  },
  Uri: {
    file: vi.fn((path: string) => ({ fsPath: path, scheme: "file", path })),
    from: vi.fn(({ scheme, authority, path }) => ({ scheme, authority, path })),
    joinPath: vi.fn(),
  },
  commands: {
    executeCommand: vi.fn(),
  },
  Range: class {
    constructor(
      public line: number,
      public character: number,
      public endLine: number,
      public endCharacter: number
    ) {}
  },
  EventEmitter: vi.fn().mockImplementation(() => ({
    event: vi.fn(),
    fire: vi.fn(),
    dispose: vi.fn(),
  })),
  WebviewView: class {},
}))

describe("FileChangesPanelProvider", () => {
  let provider: FileChangesPanelProvider
  let mockDiffProvider: DiffContentProvider
  let mockContext: vscode.ExtensionContext

  beforeEach(() => {
    vi.clearAllMocks()

    mockDiffProvider = {
      setContent: vi.fn(),
      provideTextDocumentContent: vi.fn(),
      clearContent: vi.fn(),
      dispose: vi.fn(),
      onDidChange: vi.fn(),
      _onDidChange: { event: vi.fn(), fire: vi.fn(), dispose: vi.fn() },
      contents: new Map(),
    } as unknown as DiffContentProvider

    mockContext = {
      extensionUri: { fsPath: "/extension" } as vscode.Uri,
      subscriptions: [],
    } as unknown as vscode.ExtensionContext

    provider = new FileChangesPanelProvider(mockContext, mockDiffProvider)
  })

  describe("file.open handler", () => {
    it("should call vscode.workspace.openTextDocument and showTextDocument for file.open message", async () => {
      const mockDoc = { uri: { fsPath: "/workspace/src/file.ts" } }
      const openTextDocumentMock = vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue(mockDoc as unknown as vscode.TextDocument)
      const showTextDocumentMock = vi.mocked(vscode.window.showTextDocument).mockResolvedValue(undefined as unknown as vscode.TextEditor)

      const handleMessage = (provider as unknown as { handleMessage: (msg: { type: string; path?: string; line?: number }) => void }).handleMessage.bind(provider)
      
      handleMessage({ type: "file.open", path: "src/file.ts", line: 10 })

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(openTextDocumentMock).toHaveBeenCalledTimes(1)
      expect(showTextDocumentMock).toHaveBeenCalledTimes(1)
    })

    it("should handle absolute paths correctly", async () => {
      const mockDoc = { uri: { fsPath: "/absolute/path/file.ts" } }
      const openTextDocumentMock = vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue(mockDoc as unknown as vscode.TextDocument)
      const showTextDocumentMock = vi.mocked(vscode.window.showTextDocument).mockResolvedValue(undefined as unknown as vscode.TextEditor)

      const handleMessage = (provider as unknown as { handleMessage: (msg: { type: string; path?: string; line?: number }) => void }).handleMessage.bind(provider)
      
      handleMessage({ type: "file.open", path: "/absolute/path/file.ts" })

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(openTextDocumentMock).toHaveBeenCalledWith(expect.objectContaining({ path: "/absolute/path/file.ts" }))
      expect(showTextDocumentMock).toHaveBeenCalled()
    })

    it("should set selection when line is provided", async () => {
      const mockDoc = { uri: { fsPath: "/workspace/src/file.ts" } }
      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue(mockDoc as unknown as vscode.TextDocument)
      vi.mocked(vscode.window.showTextDocument).mockResolvedValue(undefined as unknown as vscode.TextEditor)

      const handleMessage = (provider as unknown as { handleMessage: (msg: { type: string; path?: string; line?: number }) => void }).handleMessage.bind(provider)
      
      handleMessage({ type: "file.open", path: "src/file.ts", line: 5 })

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(vscode.window.showTextDocument).toHaveBeenCalledWith(
        mockDoc,
        expect.objectContaining({
          preview: true,
          selection: expect.any(Object),
        })
      )
    })
  })

  describe("file.diff handler", () => {
    it("should call diffProvider.setContent and executeCommand for file.diff message", async () => {
      const executeCommandMock = vi.mocked(vscode.commands.executeCommand).mockResolvedValue(undefined)

      const handleMessage = (provider as unknown as { handleMessage: (msg: { type: string; path?: string; before?: string; after?: string }) => void }).handleMessage.bind(provider)
      
      handleMessage({ 
        type: "file.diff", 
        path: "src/file.ts", 
        before: "original content", 
        after: "modified content" 
      })

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(mockDiffProvider.setContent).toHaveBeenCalledTimes(2)
      expect(executeCommandMock).toHaveBeenCalledWith(
        "vscode.diff",
        expect.objectContaining({ scheme: "opencode-diff", authority: "before" }),
        expect.objectContaining({ scheme: "opencode-diff", authority: "after" }),
        "file.ts (Changes)"
      )
    })

    it("should not process file.diff if required fields are missing", () => {
      const handleMessage = (provider as unknown as { handleMessage: (msg: { type: string; path?: string; before?: string; after?: string }) => void }).handleMessage.bind(provider)
      
      handleMessage({ type: "file.diff", before: "content", after: "content" } as { type: string; path?: string; before?: string; after?: string })
      expect(mockDiffProvider.setContent).not.toHaveBeenCalled()

      handleMessage({ type: "file.diff", path: "file.ts", after: "content" })
      expect(mockDiffProvider.setContent).not.toHaveBeenCalled()

      handleMessage({ type: "file.diff", path: "file.ts", before: "content" })
      expect(mockDiffProvider.setContent).not.toHaveBeenCalled()
    })

    it("should handle absolute paths for diff", async () => {
      const executeCommandMock = vi.mocked(vscode.commands.executeCommand).mockResolvedValue(undefined)

      const handleMessage = (provider as unknown as { handleMessage: (msg: { type: string; path?: string; before?: string; after?: string }) => void }).handleMessage.bind(provider)
      
      handleMessage({ 
        type: "file.diff", 
        path: "/absolute/path/file.ts", 
        before: "before", 
        after: "after" 
      })

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(mockDiffProvider.setContent).toHaveBeenCalledWith(
        expect.objectContaining({ path: "/absolute/path/file.ts" }),
        "before"
      )
      expect(executeCommandMock).toHaveBeenCalled()
    })

    it("should handle empty before/after content", async () => {
      const executeCommandMock = vi.mocked(vscode.commands.executeCommand).mockResolvedValue(undefined)

      const handleMessage = (provider as unknown as { handleMessage: (msg: { type: string; path?: string; before?: string; after?: string }) => void }).handleMessage.bind(provider)
      
      handleMessage({ 
        type: "file.diff", 
        path: "src/file.ts", 
        before: "", 
        after: "" 
      })

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(mockDiffProvider.setContent).toHaveBeenCalledWith(
        expect.any(Object),
        ""
      )
      expect(executeCommandMock).toHaveBeenCalled()
    })
  })

  describe("messageHandlers registry", () => {
    it("should have file.open handler registered", () => {
      expect(messageHandlers["file.open"]).toBeDefined()
      expect(typeof messageHandlers["file.open"]).toBe("function")
    })

    it("should have file.diff handler registered", () => {
      expect(messageHandlers["file.diff"]).toBeDefined()
      expect(typeof messageHandlers["file.diff"]).toBe("function")
    })

    it("should return undefined for unknown message types", () => {
      expect(messageHandlers["unknown.type"]).toBeUndefined()
    })
  })
})
