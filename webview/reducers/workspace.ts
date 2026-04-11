import type { AppState } from "../state"
import type { ActionHandler } from "./types"

export const handleWorkspaceMissing: ActionHandler = (state) => ({
  ...state,
  workspaceMissing: true,
})
