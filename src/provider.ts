import * as vscode from "vscode"
import * as path from "path"
import * as crypto from "crypto"
import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk"
import { connect, type ServerHandle } from "./server"
import { MentionResolver } from "./mentions"
import type { HostMessage, WebviewMessage, FileDiff } from "./types"
import { DiffContentProvider } from "./diffProvider"
import type { FileChangesPanelProvider } from "./FileChangesPanelProvider"

export class ChatProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView
  private client?: OpencodeClient
  private serverHandle?: ServerHandle
  private mentions: MentionResolver
  private eventAbort = new AbortController()
  private directory?: string
  private activeSessionID?: string
  private activeSessionDiffs: FileDiff[] = []

  constructor(
    private ctx: vscode.ExtensionContext,
    private diffProvider: DiffContentProvider,
    private fileChangesProvider?: FileChangesPanelProvider
  ) {
    this.mentions = new MentionResolver()
    const folders = vscode.workspace.workspaceFolders
    this.directory = folders?.[0]?.uri.fsPath
    ctx.subscriptions.push(this.mentions)
  }

  public getActiveSessionID(): string | undefined {
    return this.activeSessionID
  }

  public getActiveSessionDiffs(): FileDiff[] {
    return this.activeSessionDiffs
  }

  async resolveWebviewView(view: vscode.WebviewView): Promise<void> {
    this.view = view
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.ctx.extensionUri],
    }
    view.webview.html = this.getHtml(view.webview)
    view.webview.onDidReceiveMessage((msg: WebviewMessage) => this.handleMessage(msg))

    await this.initServer()
  }

  private async initServer(): Promise<void> {
    if (!this.directory) {
      this.post({ type: "workspace.missing" })
      return
    }
    try {
      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: "Connecting to opencode..." },
        async () => {
          this.serverHandle = await connect(this.eventAbort.signal)
          this.client = createOpencodeClient({
            baseUrl: this.serverHandle.url,
            directory: this.directory,
          })
          this.startEventLoop()
          this.post({ type: "server.ready", url: this.serverHandle.url })

          // Load and send available commands
          try {
            const cmdResult = await this.client.command.list({ directory: this.directory })
            console.log('[provider] Auto-loading commands:', cmdResult.data?.length || 0)
            if (cmdResult.data) {
              this.post({ type: "commands.list", commands: cmdResult.data })
            }
          } catch (cmdErr) {
            console.error('[provider] Failed to load commands:', cmdErr)
          }

          // Load user config for default model and agent
          try {
            const configResult = await this.client.config.get({ directory: this.directory })
            console.log('[provider] User config:', configResult.data)
            if (configResult.data) {
              this.post({ 
                type: "config.get", 
                config: {
                  model: configResult.data.model,
                  default_agent: configResult.data.default_agent
                }
              })
            }
          } catch (configErr) {
            console.error('[provider] Failed to load config:', configErr)
          }

          const sessionResult = await this.client.session.list({ directory: this.directory })
          if (sessionResult.data) {
            this.post({ type: "sessions.list", sessions: sessionResult.data })
          }

          // Load and send available providers
          try {
            const providerResult = await this.client.provider.list({ directory: this.directory })
            console.log('[provider] Auto-loading providers:', providerResult.data?.length || 0)
            if (providerResult.data) {
              const providers = Array.isArray(providerResult.data) ? providerResult.data : (providerResult.data as { all?: unknown[] }).all || []
              const defaults = (providerResult.data as { default?: Record<string, string> }).default
              const connected = (providerResult.data as { connected?: string[] }).connected || []
              this.post({ type: "providers.list", providers, default: defaults, connected })
            }
          } catch (providerErr) {
            console.error('[provider] Failed to load providers:', providerErr)
          }

          // Load and send available agents
          try {
            const agentResult = await this.client.app.agents({ directory: this.directory })
            console.log('[provider] Auto-loading agents:', agentResult.data?.length || 0)
            if (agentResult.data) {
              this.post({ type: "agents.list", agents: agentResult.data })
            }
          } catch (agentErr) {
            console.error('[provider] Failed to load agents:', agentErr)
          }

        },
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.post({ type: "server.error", message: msg })
    }
  }

  private async startEventLoop(): Promise<void> {
    if (!this.client) return
    console.log("[opencode] Starting event loop...")
    try {
      const result = await this.client.global.event()
      console.log("[opencode] Event stream connected")
      for await (const event of result.stream) {
        if (this.eventAbort.signal.aborted) {
          console.log("[opencode] Event loop aborted")
          break
        }
        // DEBUG: Log full event structure
        console.log("[opencode] Raw event:", JSON.stringify(event, null, 2))
        
        // Check if it's GlobalEvent { directory, payload } or direct Event { type, properties }
        const payload = (event as any).payload ?? event
        console.log("[opencode] Using payload:", JSON.stringify(payload, null, 2))
        
        // Transform message events to include parts in the message object
        if (payload.type === "message.updated" && payload.properties?.info) {
          // Only add parts if they exist in the event, otherwise preserve existing parts in webview
          if (payload.properties.parts && payload.properties.parts.length > 0) {
            payload.properties.info = {
              ...payload.properties.info,
              parts: payload.properties.parts
            }
          }
        }
        if (payload.type === "message.part.updated" && payload.properties?.part) {
          // Part is already in the right format
        }

        // Handle session.diff events to update the file changes panel
        if (payload.type === "session.diff" && payload.properties) {
          const { sessionID, diff } = payload.properties as { sessionID: string; diff: FileDiff[] }
          if (sessionID === this.activeSessionID) {
            this.activeSessionDiffs = diff
            this.fileChangesProvider?.updateDiffs(sessionID, diff)
          }
        }

        this.post({ type: "event", event: payload })
      }
      console.log("[opencode] Event stream ended, restarting...")
      if (!this.eventAbort.signal.aborted) {
        setTimeout(() => this.startEventLoop(), 2000)
      }
    } catch (err) {
      console.error("[opencode] Event loop error:", err)
      if (!this.eventAbort.signal.aborted) {
        setTimeout(() => this.startEventLoop(), 2000)
      }
    }
  }

  private async handleMessage(msg: WebviewMessage): Promise<void> {
    console.log('[provider] handleMessage called:', msg.type, 'client:', !!this.client, 'directory:', !!this.directory)
    if (!this.client || !this.directory) {
      console.log('[provider] Early return - client or directory not ready')
      return
    }

    switch (msg.type) {
      case "ready": {
        const result = await this.client.session.list({ directory: this.directory })
        if (result.data) this.post({ type: "sessions.list", sessions: result.data })
        break
      }
      case "sessions.list.request": {
        const result = await this.client.session.list({ directory: this.directory })
        if (result.data) this.post({ type: "sessions.list", sessions: result.data })
        break
      }
      case "session.create": {
        const result = await this.client.session.create({ directory: this.directory })
        if (result.data) this.post({ type: "session.created", session: result.data })
        break
      }
      case "session.select": {
        console.log("[opencode] Fetching messages for session:", msg.sessionID)
        const result = await this.client.session.messages({ path: { id: msg.sessionID }, query: { directory: this.directory } })
        console.log("[opencode] Messages result:", result)
        if (result.error) {
          console.error("[opencode] Failed to fetch messages:", result.error)
          // Send empty messages list so UI doesn't hang
          this.post({ type: "messages.list", sessionID: msg.sessionID, messages: [] })
        } else if (result.data) {
          // Transform API response { info, parts } to webview format
          const messages = result.data.map((item: any) => ({
            ...item.info,
            parts: item.parts || []
          }))
          console.log("[opencode] Sending messages.list with", messages.length, "messages")
          this.post({ type: "messages.list", sessionID: msg.sessionID, messages })
        } else {
          console.warn("[opencode] No messages data returned")
          // Send empty messages list so UI doesn't hang
          this.post({ type: "messages.list", sessionID: msg.sessionID, messages: [] })
        }

        // Load session diff
        console.log("[opencode] Fetching diff for session:", msg.sessionID)
        try {
          const diffResult = await this.client.session.diff({ path: { id: msg.sessionID }, query: { directory: this.directory } })
          console.log("[opencode] Diff result:", diffResult)
          this.activeSessionID = msg.sessionID
          if (diffResult.data && diffResult.data.length > 0) {
            console.log("[opencode] Sending session.diff with", diffResult.data.length, "diffs")
            this.activeSessionDiffs = diffResult.data
            this.post({ type: "session.diff", sessionID: msg.sessionID, diffs: diffResult.data })
            this.fileChangesProvider?.show(msg.sessionID, diffResult.data)
            vscode.commands.executeCommand("workbench.action.focusAuxiliaryBar")
            vscode.commands.executeCommand("opencode.fileChanges.focus")
          } else {
            console.warn("[opencode] No diff data returned")
            this.activeSessionDiffs = []
            this.post({ type: "session.diff", sessionID: msg.sessionID, diffs: [] })
            this.fileChangesProvider?.show(msg.sessionID, [])
          }
        } catch (diffErr) {
          console.error("[opencode] Failed to fetch diff:", diffErr)
          this.activeSessionDiffs = []
          this.post({ type: "session.diff", sessionID: msg.sessionID, diffs: [] })
        }
        break
      }
      case "session.delete": {
        await this.client.session.delete({ path: { id: msg.sessionID }, query: { directory: this.directory } })
        this.post({ type: "session.deleted", sessionID: msg.sessionID })
        break
      }
      case "session.abort": {
        await this.client.session.abort({ path: { id: msg.sessionID }, query: { directory: this.directory } })
        break
      }
      case "prompt": {
        console.log("[opencode] Sending prompt:", msg.sessionID, "parts:", msg.parts.length)
        try {
          await this.client.session.prompt({
            path: { id: msg.sessionID },
            query: { directory: this.directory },
            body: { parts: msg.parts },
          })
          console.log("[opencode] Prompt sent successfully")
        } catch (err) {
          console.error("[opencode] Failed to send prompt:", err)
        }
        break
      }
      case "permission.reply": {
        await this.client.permission.reply({
          requestID: msg.requestID,
          directory: this.directory,
          reply: msg.reply,
        })
        break
      }
      case "mention.resolve": {
        if (msg.kind === "selection") {
          const sel = this.mentions.resolveSelection()
          this.post({ type: "context.resolved", kind: "selection", payload: sel })
        } else if (msg.kind === "problems") {
          const probs = this.mentions.resolveProblems()
          this.post({ type: "context.resolved", kind: "problems", payload: probs })
        } else if (msg.kind === "terminal") {
          const text = this.mentions.resolveTerminal()
          this.post({ type: "context.resolved", kind: "terminal", payload: text })
        }
        break
      }
      case "files.search": {
        const result = await this.client.find.files({ directory: this.directory, query: msg.query })
        this.post({ type: "context.resolved", kind: "files", payload: result.data })
        break
      }
      case "symbols.search": {
        const result = await this.client.find.symbols({ directory: this.directory, query: msg.query })
        this.post({ type: "context.resolved", kind: "files", payload: result.data })
        break
      }
      case "providers.list.request": {
        const result = await this.client.provider.list({ directory: this.directory })
        if (result.data) {
          // Handle case where API returns { all: [...], default: {...}, connected: [...] } instead of [...]
          const providers = Array.isArray(result.data) ? result.data : (result.data as { all?: unknown[] }).all || []
          const defaults = (result.data as { default?: Record<string, string> }).default
          const connected = (result.data as { connected?: string[] }).connected || []
          this.post({ type: "providers.list", providers, default: defaults, connected })
        }
        break
      }
      case "commands.list.request": {
        console.log('[provider] Received commands.list.request')
        const result = await this.client.command.list({ directory: this.directory })
        console.log('[provider] command.list result:', result)
        if (result.data) this.post({ type: "commands.list", commands: result.data })
        break
      }
      case "agents.list.request": {
        console.log('[provider] Received agents.list.request')
        try {
          const result = await this.client.app.agents({ directory: this.directory })
          console.log('[provider] agents result:', result)
          console.log('[provider] agent.list result:', result)
          if (result?.data) this.post({ type: "agents.list", agents: result.data })
        } catch (err) {
          console.error('[provider] Failed to load agents:', err)
        }
        break
      }
      case "file.open": {
        if (!this.directory || !msg.path) {
          console.log('[provider] file.open: missing directory or path')
          return
        }
        const openFilePath = path.isAbsolute(msg.path) ? msg.path : path.join(this.directory, msg.path)
        console.log('[provider] file.open: opening file at', openFilePath)
        
        // Check if file exists
        const fs = require('fs')
        if (!fs.existsSync(openFilePath)) {
          console.error('[provider] file.open: file does not exist', openFilePath)
          vscode.window.showErrorMessage(`文件不存在: ${msg.path}`)
          return
        }
        
        const openUri = vscode.Uri.file(openFilePath)
        const openOptions: vscode.TextDocumentShowOptions = {
          preview: true,
        }
        if (msg.line !== undefined && msg.line >= 0) {
          openOptions.selection = new vscode.Range(msg.line, msg.column ?? 0, msg.line, msg.column ?? 0)
        }
        
        console.log('[provider] file.open: calling openTextDocument')
        vscode.workspace.openTextDocument(openUri).then((doc: vscode.TextDocument) => {
          console.log('[provider] file.open: document opened, calling showTextDocument')
          return vscode.window.showTextDocument(doc, openOptions)
        }).then((editor: vscode.TextEditor) => {
          console.log('[provider] file.open: file opened successfully in editor')
          // Focus the editor
          vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup')
        }, (err: Error) => {
          console.error('[provider] file.open: error', err)
          vscode.window.showErrorMessage(`无法打开文件: ${err.message}`)
        })
        break
      }
      case "file.diff": {
        if (!this.directory || !msg.path) {
          console.log('[provider] file.diff: missing directory or path')
          return
        }
        const diffFilePath = path.isAbsolute(msg.path) ? msg.path : path.join(this.directory, msg.path)
        console.log('[provider] file.diff: showing diff for', diffFilePath)

        // Create URIs for diff view
        const beforeUri = vscode.Uri.from({
          scheme: 'opencode-diff',
          authority: 'before',
          path: diffFilePath
        })
        const afterUri = vscode.Uri.from({
          scheme: 'opencode-diff',
          authority: 'after',
          path: diffFilePath
        })

        // Set content for the URIs
        this.diffProvider.setContent(beforeUri, msg.before || '')
        this.diffProvider.setContent(afterUri, msg.after || '')

        vscode.commands.executeCommand(
          "vscode.diff",
          beforeUri,
          afterUri,
          `${msg.path} (Changes)`,
        ).then(() => {
          console.log('[provider] file.diff: diff shown successfully')
        }, (err: Error) => {
          console.error('[provider] file.diff: error showing diff', err)
          vscode.window.showErrorMessage(`无法显示差异: ${err.message}`)
        })
        break
      }
    }
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
    if (!this.client || !this.directory) return
    const result = await this.client.session.create({ directory: this.directory })
    if (result.data) this.post({ type: "session.created", session: result.data })
    vscode.commands.executeCommand("opencode.chat.focus")
  }

  attachSelection(): void {
    const sel = this.mentions.resolveSelection()
    if (sel) {
      this.post({ type: "context.resolved", kind: "selection", payload: sel })
      vscode.commands.executeCommand("opencode.chat.focus")
    }
  }

  dispose(): void {
    this.eventAbort.abort()
    if (this.serverHandle?.spawned) {
      this.serverHandle.dispose()
    }
    this.mentions.dispose()
  }
}