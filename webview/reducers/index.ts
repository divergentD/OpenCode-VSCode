import type { ActionRegistry } from "./types"
import { handleServerReady, handleServerError } from "./server"
import { handleWorkspaceMissing } from "./workspace"
import { handleSessionsList, handleSessionCreated, handleSessionDeleted } from "./sessions"
import { handleMessagesList } from "./messages"
import { handleContextResolved } from "./context"
import { handleCommandsList } from "./commands"
import { handleConfigGet } from "./config"
import { handleProvidersList } from "./providers"
import { handleAgentsList, handleAgentSelect } from "./agents"
import { handleModelSelect } from "./model"
import { handleSessionDiff } from "./diff"

export const actionHandlers: ActionRegistry = {
  "server.ready": handleServerReady as ActionRegistry[string],
  "server.error": handleServerError as ActionRegistry[string],
  "workspace.missing": handleWorkspaceMissing as ActionRegistry[string],
  "sessions.list": handleSessionsList as ActionRegistry[string],
  "session.created": handleSessionCreated as ActionRegistry[string],
  "session.deleted": handleSessionDeleted as ActionRegistry[string],
  "messages.list": handleMessagesList as ActionRegistry[string],
  "context.resolved": handleContextResolved as ActionRegistry[string],
  "commands.list": handleCommandsList as ActionRegistry[string],
  "config.get": handleConfigGet as ActionRegistry[string],
  "providers.list": handleProvidersList as ActionRegistry[string],
  "agents.list": handleAgentsList as ActionRegistry[string],
  "agent.select": handleAgentSelect as ActionRegistry[string],
  "model.select": handleModelSelect as ActionRegistry[string],
  "session.diff": handleSessionDiff as ActionRegistry[string],
}

export * from "./types"
