import * as vscode from "vscode"
import * as path from "path"
import * as crypto from "crypto"
import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk"
import { connect, type ServerHandle } from "./server"
import { MentionResolver } from "./mentions"
import type { HostMessage, WebviewMessage, FileDiff } from "./types"
import { DiffContentProvider } from "./diffProvider"
import type { FileChangesPanelProvider } from "./FileChangesPanelProvider"
import { commandRegistry } from "./commands"

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
    
    ctx.subscriptions.push(
      vscode.window.onDidChangeActiveColorTheme((theme) => {
        this.postThemeChange(theme)
      })
    )
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
    
    this.postThemeChange(vscode.window.activeColorTheme)
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
            const cmdResult = await this.client.command.list({ query: { directory: this.directory } })
            console.log('[provider] Auto-loading commands:', cmdResult.data?.length || 0)
            if (cmdResult.data) {
              this.post({ type: "commands.list", commands: cmdResult.data })
            }
          } catch (cmdErr) {
            console.error('[provider] Failed to load commands:', cmdErr)
          }

          // Load user config for default model and agent
          try {
            const configResult = await this.client.config.get({ query: { directory: this.directory } })
            console.log('[provider] User config:', configResult.data)
            if (configResult.data) {
              this.post({ 
                type: "config.get", 
                config: {
                  model: configResult.data.model,
                  default_agent: (configResult.data as { default_agent?: string }).default_agent
                }
              })
            }
          } catch (configErr) {
            console.error('[provider] Failed to load config:', configErr)
          }

          const sessionResult = await this.client.session.list({ query: { directory: this.directory } })
          if (sessionResult.data) {
            this.post({ type: "sessions.list", sessions: sessionResult.data })
          }

          // Load and send available providers
          try {
            const providerResult = await this.client.provider.list({ query: { directory: this.directory } })
            console.log('[provider] Auto-loading providers:', (providerResult.data as { all?: unknown[] })?.all?.length || 0)
            if (providerResult.data) {
              const providers = (providerResult.data as { all?: unknown[] }).all || []
              const defaults = (providerResult.data as { default?: Record<string, string> }).default
              const connected = (providerResult.data as { connected?: string[] }).connected || []
              this.post({ type: "providers.list", providers, default: defaults, connected })
            }
          } catch (providerErr) {
            console.error('[provider] Failed to load providers:', providerErr)
          }

          // Load and send available agents
          try {
            const agentResult = await this.client.app.agents({ query: { directory: this.directory } })
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
    console.log("[provider] handleMessage called:", msg.type, "client:", !!this.client, "directory:", !!this.directory)
    if (!this.client || !this.directory) {
      console.log("[provider] Early return - client or directory not ready")
      return
    }

    const command = commandRegistry.get(msg.type)
    if (command) {
      await command.execute(this, msg)
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
    const result = await this.client.session.create({ query: { directory: this.directory } })
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
    this.eventAbort.abort()
    if (this.serverHandle?.spawned) {
      this.serverHandle.dispose()
    }
    this.mentions.dispose()
  }
}