import * as vscode from "vscode"
import { ServerManager, MessageDispatcher, SessionManager, ContextManager } from "./managers"
import { WebviewProvider, ServerEventHandler, MessageHandler } from "./providers"
import type { HostMessage, WebviewMessage, FileDiff } from "./types"
import { DiffContentProvider } from "./diffProvider"
import type { FileChangesPanelProvider } from "./FileChangesPanelProvider"

export class ChatProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private webviewProvider: WebviewProvider
  private serverManager: ServerManager
  private serverEventHandler: ServerEventHandler
  private messageHandler: MessageHandler
  private contextManager: ContextManager
  private messageDispatcher?: MessageDispatcher
  private sessionManager?: SessionManager
  private directory?: string

  constructor(
    private ctx: vscode.ExtensionContext,
    private diffProvider: DiffContentProvider,
    private fileChangesProvider?: FileChangesPanelProvider
  ) {
    this.contextManager = new ContextManager()
    this.webviewProvider = new WebviewProvider(ctx)
    const folders = vscode.workspace.workspaceFolders
    this.directory = folders?.[0]?.uri.fsPath
    this.serverManager = new ServerManager(this.directory)

    this.serverEventHandler = new ServerEventHandler({
      post: (msg) => this.post(msg),
      onServerReady: (url) => this.onServerReady(url),
      onEvent: (event) => this.handleEvent(event),
    })
    this.serverEventHandler.attach(this.serverManager)

    this.messageHandler = new MessageHandler({
      onSessionSelect: (sessionID) => this.handleSessionSelect(sessionID),
    })

    ctx.subscriptions.push(this.contextManager)

    ctx.subscriptions.push(
      vscode.window.onDidChangeActiveColorTheme((theme) => {
        this.postThemeChange(theme)
      })
    )
  }

  private handleEvent(event: unknown): void {
    const payload = event as any
    if (payload.type === "session.diff" && payload.properties && this.sessionManager) {
      const { sessionID, diff } = payload.properties as { sessionID: string; diff: FileDiff[] }
      this.sessionManager.updateDiffs(sessionID, diff)
    }
  }

  private onServerReady(url: string): void {
    console.log("[ChatProvider] Server ready at:", url)
    const client = this.serverManager.getClient()
    const directory = this.serverManager.getDirectory()

    if (client && directory) {
      this.sessionManager = new SessionManager(client, directory, this.fileChangesProvider)
      this.messageDispatcher = new MessageDispatcher(
        client,
        directory,
        (msg) => this.post(msg),
        this.diffProvider,
        this.sessionManager,
        this.contextManager,
        this.fileChangesProvider
      )
      this.messageHandler.setMessageDispatcher(this.messageDispatcher)
    }
  }

  public getActiveSessionID(): string | undefined {
    return this.sessionManager?.getActiveSessionID()
  }

  public getActiveSessionDiffs(): FileDiff[] {
    return this.sessionManager?.getActiveSessionDiffs() || []
  }

  private handleSessionSelect(sessionID: string): void {
    this.sessionManager?.setActiveSessionID(sessionID)
  }

  async resolveWebviewView(view: vscode.WebviewView): Promise<void> {
    this.webviewProvider.resolveWebviewView(view)
    this.webviewProvider.setOnDidReceiveMessage((msg: WebviewMessage) => this.handleMessage(msg))

    await this.serverManager.connect()
    this.postThemeChange(vscode.window.activeColorTheme)
  }

  private async handleMessage(msg: WebviewMessage): Promise<void> {
    await this.messageHandler.handleMessage(msg)
  }

  private post(msg: HostMessage): void {
    this.webviewProvider.post(msg)
  }

  async newSession(): Promise<void> {
    const client = this.serverManager.getClient()
    const directory = this.serverManager.getDirectory()
    if (!client || !directory) return

    const result = await client.session.create({ query: { directory } })
    if (result.data) {
      this.post({ type: "session.created", session: result.data })
    }
    vscode.commands.executeCommand("opencode.chat.focus")
  }

  attachSelection(): void {
    const sel = this.contextManager.resolveSelection()
    if (sel) {
      this.post({ type: "context.resolved", kind: "selection", payload: sel })
      vscode.commands.executeCommand("opencode.chat.focus")
    }
  }

  private postThemeChange(theme: vscode.ColorTheme): void {
    let kind: "light" | "dark" | "highContrast" | "highContrastLight"
    switch (theme.kind) {
      case vscode.ColorThemeKind.Light:
        kind = "light"
        break
      case vscode.ColorThemeKind.Dark:
        kind = "dark"
        break
      case vscode.ColorThemeKind.HighContrast:
        kind = "highContrast"
        break
      case vscode.ColorThemeKind.HighContrastLight:
        kind = "highContrastLight"
        break
      default:
        kind = "dark"
    }
    this.post({ type: "theme.changed", theme: { kind } })
  }

  dispose(): void {
    this.serverManager.dispose()
    this.contextManager.dispose()
  }
}