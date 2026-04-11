import type { AppState } from "../state"
import type { FileDiff } from "../types"
import type { ActionHandler } from "./types"

export const handleSessionDiff: ActionHandler<{
  sessionID: string
  diffs: FileDiff[]
}> = (state, { sessionID, diffs }) => ({
  ...state,
  fileChanges: {
    ...state.fileChanges,
    [sessionID]: diffs,
  },
})
