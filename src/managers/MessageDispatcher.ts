import type { OpencodeClient } from "@opencode-ai/sdk"
import type { WebviewMessage, HostMessage } from "../types"
import type { DiffContentProvider } from "../diffProvider"
import type { SessionManager } from "./SessionManager"
import type { ContextManager } from "./ContextManager"
import type { FileChangesPanelProvider } from "../FileChangesPanelProvider"
import { commandRegistry } from "../commands"

export class MessageDispatcher {
  constructor(
    private client: OpencodeClient,
    private directory: string,
    private post: (msg: HostMessage) => void,
    private diffProvider?: DiffContentProvider,
    private sessionManager?: SessionManager,
    private contextManager?: ContextManager,
    private fileChangesProvider?: FileChangesPanelProvider
  ) {}

  public async handleMessage(msg: WebviewMessage): Promise<void> {
    console.log("[MessageDispatcher] handleMessage called:", msg.type)

    if (!this.client || !this.directory) {
      console.log("[MessageDispatcher] Early return - client or directory not ready")
      return
    }

    const command = commandRegistry.get(msg.type)
    if (command) {
      await command.execute(this, msg)
    } else {
      console.warn("[MessageDispatcher] No handler found for message type:", msg.type)
    }
  }

  public getClient(): OpencodeClient {
    return this.client
  }

  public getDirectory(): string {
    return this.directory
  }

  public postMessage(msg: HostMessage): void {
    this.post(msg)
  }

  public getDiffProvider(): DiffContentProvider | undefined {
    return this.diffProvider
  }

  public getSessionManager(): SessionManager | undefined {
    return this.sessionManager
  }

  public getContextManager(): ContextManager | undefined {
    return this.contextManager
  }

  public getFileChangesProvider(): FileChangesPanelProvider | undefined {
    return this.fileChangesProvider
  }
}