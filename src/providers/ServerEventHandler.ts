import type { ServerManager, ServerEvent } from "../managers"
import type { HostMessage } from "../types"

export interface ServerEventHandlerDependencies {
  post: (msg: HostMessage) => void
  onServerReady?: (url: string) => void
  onEvent?: (event: unknown) => void
}

export class ServerEventHandler {
  constructor(private dependencies: ServerEventHandlerDependencies) {}

  public attach(serverManager: ServerManager): void {
    serverManager.onEvent((event) => this.handleEvent(event))
  }

  private handleEvent(event: ServerEvent): void {
    console.log("[ServerEventHandler] Server event:", event.type)

    switch (event.type) {
      case "server.ready":
        this.handleServerReady(event.url!)
        break
      case "server.error":
        this.dependencies.post({ type: "server.error", message: event.message! })
        break
      case "sessions.list":
        this.dependencies.post({ type: "sessions.list", sessions: event.sessions! })
        break
      case "commands.list":
        this.dependencies.post({ type: "commands.list", commands: event.commands! })
        break
      case "config.get":
        this.dependencies.post({ type: "config.get", config: event.config! })
        break
      case "providers.list":
        this.dependencies.post({ type: "providers.list", providers: event.providers!, default: event.default, connected: event.connected })
        break
      case "agents.list":
        this.dependencies.post({ type: "agents.list", agents: event.agents! })
        break
      case "event":
        this.handleGenericEvent(event.event!)
        break
    }
  }

  private handleServerReady(url: string): void {
    console.log("[ServerEventHandler] Server ready at:", url)
    this.dependencies.post({ type: "server.ready", url })
    this.dependencies.onServerReady?.(url)
  }

  private handleGenericEvent(event: unknown): void {
    console.log("[ServerEventHandler] Event:", JSON.stringify(event, null, 2))
    this.dependencies.post({ type: "event", event })
    this.dependencies.onEvent?.(event)
  }
}