import type { AppState } from "../state"
import type { ActionHandler } from "./types"

export const handleModelSelect: ActionHandler<{ modelID: string | null }> = (
  state,
  { modelID }
) => ({
  ...state,
  selectedModel: modelID,
})
