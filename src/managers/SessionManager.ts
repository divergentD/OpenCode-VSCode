import type { OpencodeClient } from "@opencode-ai/sdk"
import type { FileDiff } from "../types"
import type { FileChangesPanelProvider } from "../FileChangesPanelProvider"

export class SessionManager {
  private activeSessionID?: string
  private activeSessionDiffs: FileDiff[] = []

  constructor(
    private client: OpencodeClient,
    private directory: string,
    private fileChangesProvider?: FileChangesPanelProvider
  ) {}

  public getActiveSessionID(): string | undefined {
    return this.activeSessionID
  }

  public setActiveSessionID(sessionID: string | undefined): void {
    this.activeSessionID = sessionID
  }

  public getActiveSessionDiffs(): FileDiff[] {
    return this.activeSessionDiffs
  }

  public setActiveSessionDiffs(diffs: FileDiff[]): void {
    this.activeSessionDiffs = diffs
  }

  public async createSession(): Promise<unknown> {
    const result = await this.client.session.create({ query: { directory: this.directory } })
    return result.data
  }

  public async updateDiffs(sessionID: string, diffs: FileDiff[]): void {
    if (sessionID === this.activeSessionID) {
      this.activeSessionDiffs = diffs
      this.fileChangesProvider?.updateDiffs(sessionID, diffs)
    }
  }
}