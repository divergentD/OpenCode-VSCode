import type { Session, Message, Event, PermissionRuleset, Part } from "@opencode-ai/sdk/v2"

export type SelectionContext = {
  text: string
  file: string
  range: string
}

export type ProblemContext = {
  file: string
  line: number
  severity: "error" | "warning" | "info"
  message: string
  source?: string
}

export type HostMessage =
  | { type: "server.ready"; url: string }
  | { type: "server.error"; message: string }
  | { type: "sessions.list"; sessions: Session[] }
  | { type: "session.created"; session: Session }
  | { type: "session.deleted"; sessionID: string }
  | { type: "messages.list"; sessionID: string; messages: Message[] }
  | { type: "event"; event: Event }
  | { type: "context.resolved"; kind: "selection" | "problems" | "terminal" | "files"; payload: unknown }
  | { type: "providers.list"; providers: unknown[] }
  | { type: "commands.list"; commands: unknown[] }
  | { type: "workspace.missing" }
  | { type: "server.ready"; url: string }
  | { type: "server.error"; message: string }
  | { type: "sessions.list"; sessions: Session[] }
  | { type: "session.created"; session: Session }
  | { type: "session.deleted"; sessionID: string }
  | { type: "messages.list"; sessionID: string; messages: Message[] }
  | { type: "event"; event: Event }
  | { type: "context.resolved"; kind: "selection" | "problems" | "terminal" | "files"; payload: unknown }
  | { type: "providers.list"; providers: unknown[] }
  | { type: "workspace.missing" }

export type WebviewMessage =
  | { type: "ready" }
  | { type: "sessions.list.request" }
  | { type: "session.create" }
  | { type: "session.select"; sessionID: string }
  | { type: "session.delete"; sessionID: string }
  | { type: "session.abort"; sessionID: string }
  | {
      type: "prompt"
      sessionID: string
      parts: Array<{ type: "text"; text: string } | { type: "file"; mime: string; url: string; filename?: string }>
    }
  | { type: "permission.reply"; requestID: string; reply: "once" | "always" | "reject" }
  | { type: "question.reply"; requestID: string; answers: string[][] }
  | { type: "question.reject"; requestID: string }
  | { type: "mention.resolve"; kind: "selection" | "problems" | "terminal" }
  | { type: "files.search"; query: string }
  | { type: "symbols.search"; query: string }
  | { type: "providers.list.request" }

  | { type: "commands.list.request" }