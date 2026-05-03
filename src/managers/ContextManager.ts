import { MentionResolver } from "../mentions"

export class ContextManager {
  private mentions: MentionResolver

  constructor() {
    this.mentions = new MentionResolver()
  }

  public resolveSelection(): unknown {
    return this.mentions.resolveSelection()
  }

  public resolveProblems(): unknown[] {
    return this.mentions.resolveProblems()
  }

  public resolveTerminal(): string | null {
    return this.mentions.resolveTerminal()
  }

  public dispose(): void {
    this.mentions.dispose()
  }
}