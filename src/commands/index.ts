import type { Command } from "./types"
import { ReadyCommand } from "./ready"
import { SessionsListRequestCommand } from "./sessions-list-request"
import { SessionCreateCommand } from "./session-create"
import { SessionSelectCommand } from "./session-select"
import { SessionDeleteCommand } from "./session-delete"
import { SessionAbortCommand } from "./session-abort"
import { PromptCommand } from "./prompt"
import { PermissionReplyCommand } from "./permission-reply"
import { MentionResolveCommand } from "./mention-resolve"
import { FilesSearchCommand } from "./files-search"
import { SymbolsSearchCommand } from "./symbols-search"
import { ProvidersListRequestCommand } from "./providers-list-request"
import { CommandsListRequestCommand } from "./commands-list-request"
import { AgentsListRequestCommand } from "./agents-list-request"
import { FileOpenCommand } from "./file-open"
import { FileDiffCommand } from "./file-diff"

export class CommandRegistry {
  private commands = new Map<string, Command>()

  constructor() {
    this.register(new ReadyCommand())
    this.register(new SessionsListRequestCommand())
    this.register(new SessionCreateCommand())
    this.register(new SessionSelectCommand())
    this.register(new SessionDeleteCommand())
    this.register(new SessionAbortCommand())
    this.register(new PromptCommand())
    this.register(new PermissionReplyCommand())
    this.register(new MentionResolveCommand())
    this.register(new FilesSearchCommand())
    this.register(new SymbolsSearchCommand())
    this.register(new ProvidersListRequestCommand())
    this.register(new CommandsListRequestCommand())
    this.register(new AgentsListRequestCommand())
    this.register(new FileOpenCommand())
    this.register(new FileDiffCommand())
  }

  register(command: Command): void {
    this.commands.set(command.type, command)
  }

  get(type: string): Command | undefined {
    return this.commands.get(type)
  }

  has(type: string): boolean {
    return this.commands.has(type)
  }
}

export const commandRegistry = new CommandRegistry()
export type { Command }
