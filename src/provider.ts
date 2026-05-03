import * as vscode from "vscode"
import * as crypto from "crypto"
import { ServerManager, MessageDispatcher, SessionManager, ContextManager } from "./managers"
import type { HostMessage, WebviewMessage, FileDiff } from "./types"
import { DiffContentProvider } from "./diffProvider"
import type { FileChangesPanelProvider } from "./FileChangesPanelProvider"

export class ChatProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private view?: vscode.WebviewView
  private serverManager: ServerManager
  private messageDispatcher?: MessageDispatcher
  private sessionManager?: SessionManager
  private contextManager: ContextManager
  private directory?: string

  constructor(
    private ctx: vscode.ExtensionContext,
    private diffProvider: DiffContentProvider,
    private fileChangesProvider?: FileChangesPanelProvider
  ) {
    this.contextManager = new ContextManager()
    const folders = vscode.workspace.workspaceFolders
    this.directory = folders?.[0]?.uri.fsPath
    this.serverManager = new ServerManager(this.directory)

    ctx.subscriptions.push(this.contextManager)

    ctx.subscriptions.push(
      vscode.window.onDidChangeActiveColorTheme((theme) => {
        this.postThemeChange(theme)
      })
    )

    this.serverManager.onEvent((event) => {
      this.handleServerEvent(event)
    })
  }

  private handleServerEvent(event: { type: string; url?: string; message?: string; sessions?: unknown[]; commands?: unknown[]; config?: { model?: string; default_agent?: string }; providers?: unknown[]; default?: Record<string, string>; connected?: string[]; agents?: unknown[]; event?: unknown }): void {
    console.log("[ChatProvider] Server event:", event.type)

    switch (event.type) {
      case "server.ready":
        this.onServerReady(event.url!)
        break
      case "server.error":
        this.post({ type: "server.error", message: event.message! })
        break
      case "sessions.list":
        this.post({ type: "sessions.list", sessions: event.sessions! })
        break
      case "commands.list":
        this.post({ type: "commands.list", commands: event.commands! })
        break
      case "config.get":
        this.post({ type: "config.get", config: event.config! })
        break
      case "providers.list":
        this.post({ type: "providers.list", providers: event.providers!, default: event.default, connected: event.connected })
        break
      case "agents.list":
        this.post({ type: "agents.list", agents: event.agents! })
        break
      case "event":
        this.handleEvent(event.event!)
        break
    }
  }

  private handleEvent(event: unknown): void {
    console.log("[ChatProvider] Event:", JSON.stringify(event, null, 2))

    const payload = (event as any)
    this.post({ type: "event", event: payload })

    if (payload.type === "session.diff" && payload.properties && this.sessionManager) {
      const { sessionID, diff } = payload.properties as { sessionID: string; diff: FileDiff[] }
      this.sessionManager.updateDiffs(sessionID, diff)
    }
  }

  private onServerReady(url: string): void {
    console.log("[ChatProvider] Server ready at:", url)
    this.post({ type: "server.ready", url })

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
    }
  }

  public getActiveSessionID(): string | undefined {
    return this.sessionManager?.getActiveSessionID()
  }

  public getActiveSessionDiffs(): FileDiff[] {
    return this.sessionManager?.getActiveSessionDiffs() || []
  }

  async resolveWebviewView(view: vscode.WebviewView): Promise<void> {
    this.view = view
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.ctx.extensionUri],
    }
    view.webview.html = this.getHtml(view.webview)
    view.webview.onDidReceiveMessage((msg: WebviewMessage) => this.handleMessage(msg))

    await this.serverManager.connect()

    this.postThemeChange(vscode.window.activeColorTheme)
  }

  private async handleMessage(msg: WebviewMessage): Promise<void> {
    if (msg.type === "session.select" && this.sessionManager) {
      const sessionID = (msg as any).sessionID
      this.sessionManager.setActiveSessionID(sessionID)
    }

    await this.messageDispatcher?.handleMessage(msg)
  }

  private post(msg: HostMessage): void {
    this.view?.webview.postMessage(msg)
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = crypto.randomBytes(16).toString("hex")
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.ctx.extensionUri, "dist", "webview.js"))
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.ctx.extensionUri, "dist", "webview.css"))
    const cspSource = webview.cspSource
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${cspSource} data:; connect-src ${cspSource} https://models.dev;">
  <link rel="stylesheet" href="${styleUri}">
<title>opencode Chat</title>
</head>
<body>
<div id="root"></div>
<script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`
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