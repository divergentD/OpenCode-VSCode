import type { ActionHandler } from "./types"
import type { AppState } from "../state"
import type { FileDiff } from "../types"

export const handleInit: ActionHandler<{ type: "init"; sessionID: string; diffs: FileDiff[] }> = (
  state,
  action
) => ({
  sessionID: action.sessionID,
  diffs: action.diffs,
  expandedFiles: new Set(),
  theme: state.theme,
})
