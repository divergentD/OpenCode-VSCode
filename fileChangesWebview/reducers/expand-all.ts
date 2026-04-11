import type { ActionHandler } from "./types"

export const handleExpandAll: ActionHandler<{ type: "expand.all" }> = (state, _action) => ({
  ...state,
  expandedFiles: new Set(state.diffs.map((d) => (d as { file: string }).file)),
})
