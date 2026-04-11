import type { AppState } from "../state"
import type { AgentInfo } from "../types"
import type { ActionHandler } from "./types"

export const handleAgentsList: ActionHandler<{ agents: AgentInfo[] }> = (
  state,
  { agents }
) => ({
  ...state,
  agents,
})

export const handleAgentSelect: ActionHandler<{ agentID: string | null }> = (
  state,
  { agentID }
) => ({
  ...state,
  selectedAgent: agentID,
})
