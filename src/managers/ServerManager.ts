import * as vscode from "vscode"
import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk"
import { connect, type ServerHandle } from "../server"
import type { FileDiff } from "../types"

export type ServerEvent =
  | { type: "server.ready"; url: string }
  | { type: "server.error"; message: string }
  | { type: "event"; event: unknown }
  | { type: "sessions.list"; sessions: unknown[] }
  | { type: "commands.list"; commands: unknown[] }
  | { type: "config.get"; config: { model?: string; default_agent?: string } }
  | { type: "providers.list"; providers: unknown[]; default?: Record<string, string>; connected?: string[] }
  | { type: "agents.list"; agents: unknown[] }

export type ServerEventHandler = (event: ServerEvent) => void

export class ServerManager {
  private client?: OpencodeClient
  private serverHandle?: ServerHandle
  private eventAbort = new AbortController()
  private directory?: string
  private handlers: ServerEventHandler[] = []

  constructor(directory?: string) {
    this.directory = directory
  }

  public getClient(): OpencodeClient | undefined {
    return this.client
  }

  public getDirectory(): string | undefined {
    return this.directory
  }

  public setDirectory(directory: string): void {
    this.directory = directory
  }

  public onEvent(handler: ServerEventHandler): void {
    this.handlers.push(handler)
  }

  private emit(event: ServerEvent): void {
    this.handlers.forEach((handler) => handler(event))
  }

  public async connect(): Promise<void> {
    if (!this.directory) {
      this.emit({ type: "server.error", message: "No workspace directory found" })
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

          this.emit({ type: "server.ready", url: this.serverHandle.url })

          await this.loadInitialData()
          this.startEventLoop()
        },
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.emit({ type: "server.error", message: msg })
    }
  }

  private async loadInitialData(): Promise<void> {
    if (!this.client || !this.directory) return

    await Promise.all([
      this.loadCommands(),
      this.loadConfig(),
      this.loadSessions(),
      this.loadProviders(),
      this.loadAgents(),
    ])
  }

  private async loadCommands(): Promise<void> {
    try {
      const cmdResult = await this.client!.command.list({ query: { directory: this.directory! } })
      console.log('[ServerManager] Auto-loading commands:', cmdResult.data?.length || 0)
      if (cmdResult.data) {
        this.emit({ type: "commands.list", commands: cmdResult.data })
      }
    } catch (err) {
      console.error('[ServerManager] Failed to load commands:', err)
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const configResult = await this.client!.config.get({ query: { directory: this.directory! } })
      console.log('[ServerManager] User config:', configResult.data)
      if (configResult.data) {
        this.emit({
          type: "config.get",
          config: {
            model: configResult.data.model,
            default_agent: (configResult.data as { default_agent?: string }).default_agent,
          },
        })
      }
    } catch (err) {
      console.error('[ServerManager] Failed to load config:', err)
    }
  }

  private async loadSessions(): Promise<void> {
    try {
      const sessionResult = await this.client!.session.list({ query: { directory: this.directory! } })
      if (sessionResult.data) {
        this.emit({ type: "sessions.list", sessions: sessionResult.data })
      }
    } catch (err) {
      console.error('[ServerManager] Failed to load sessions:', err)
    }
  }

  private async loadProviders(): Promise<void> {
    try {
      const providerResult = await this.client!.provider.list({ query: { directory: this.directory! } })
      console.log('[ServerManager] Auto-loading providers:', (providerResult.data as { all?: unknown[] })?.all?.length || 0)
      if (providerResult.data) {
        const providers = (providerResult.data as { all?: unknown[] }).all || []
        const defaults = (providerResult.data as { default?: Record<string, string> }).default
        const connected = (providerResult.data as { connected?: string[] }).connected || []
        this.emit({ type: "providers.list", providers, default: defaults, connected })
      }
    } catch (err) {
      console.error('[ServerManager] Failed to load providers:', err)
    }
  }

  private async loadAgents(): Promise<void> {
    try {
      const agentResult = await this.client!.app.agents({ query: { directory: this.directory! } })
      console.log('[ServerManager] Auto-loading agents:', agentResult.data?.length || 0)
      if (agentResult.data) {
        this.emit({ type: "agents.list", agents: agentResult.data })
      }
    } catch (err) {
      console.error('[ServerManager] Failed to load agents:', err)
    }
  }

  private async startEventLoop(): Promise<void> {
    if (!this.client) return
    console.log("[ServerManager] Starting event loop...")

    try {
      const result = await this.client.global.event()
      console.log("[ServerManager] Event stream connected")

      for await (const event of result.stream) {
        if (this.eventAbort.signal.aborted) {
          console.log("[ServerManager] Event loop aborted")
          break
        }

        console.log("[ServerManager] Raw event:", JSON.stringify(event, null, 2))

    const payload = (event as Record<string, unknown>).payload ?? event
    console.log("[ServerManager] Using payload:", JSON.stringify(payload, null, 2))

    const typedPayload = payload as Record<string, unknown>
    if (typedPayload.type === "message.updated") {
      const properties = typedPayload.properties as Record<string, unknown> | undefined
      if (properties?.info) {
        const parts = properties.parts as unknown[] | undefined
        if (parts && parts.length > 0) {
          const info = properties.info as Record<string, unknown>
          properties.info = {
            ...info,
            parts,
          }
        }
      }
    }

    this.emit({ type: "event", event: payload })
      }

      console.log("[ServerManager] Event stream ended, restarting...")
      if (!this.eventAbort.signal.aborted) {
        setTimeout(() => this.startEventLoop(), 2000)
      }
    } catch (err) {
      console.error("[ServerManager] Event loop error:", err)
      if (!this.eventAbort.signal.aborted) {
        setTimeout(() => this.startEventLoop(), 2000)
      }
    }
  }

  public dispose(): void {
    this.eventAbort.abort()
    if (this.serverHandle?.spawned) {
      this.serverHandle.dispose()
    }
  }
}