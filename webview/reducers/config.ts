import type { AppState } from "../state"
import type { ActionHandler } from "./types"

export const handleConfigGet: ActionHandler<{
  config: { model?: string; default_agent?: string }
}> = (state, { config }) => {
  let selectedModel = state.selectedModel
  let selectedAgent = state.selectedAgent

  if (!selectedModel && config.model) {
    const modelStr = config.model
    if (modelStr.includes("/")) {
      const [providerId, modelId] = modelStr.split("/")
      selectedModel = `${providerId}:${modelId}`
    } else if (modelStr.includes(":")) {
      selectedModel = modelStr
    }
  }

  if (!selectedAgent && config.default_agent) {
    selectedAgent = config.default_agent
  }

  return {
    ...state,
    selectedModel,
    selectedAgent,
  }
}
