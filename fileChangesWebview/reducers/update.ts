import type { ActionHandler } from "./types"
import type { FileDiff } from "../types"

export const handleUpdate: ActionHandler<{ type: "update"; sessionID: string; diffs: FileDiff[] }> = (
  state,
  action
) => ({
  ...state,
  sessionID: action.sessionID,
  diffs: action.diffs,
})
