import type { OpencodeClient } from "@opencode-ai/sdk"
import type { FileDiff } from "../types"
import type { FileChangesPanelProvider } from "../FileChangesPanelProvider"

export class SessionManager {
  constructor(
    private client: OpencodeClient,
    private directory: string,
    private fileChangesProvider?: FileChangesPanelProvider
  ) {}

  public async createSession(): Promise<unknown> {
    const result = await this.client.session.create({ query: { directory: this.directory } })
    return result.data
  }

  public async updateDiffs(sessionID: string, diffs: FileDiff[]): void {
    this.fileChangesProvider?.updateDiffs(sessionID, diffs)
  }
}