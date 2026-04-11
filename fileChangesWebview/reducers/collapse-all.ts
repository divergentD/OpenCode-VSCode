import type { ActionHandler } from "./types"

export const handleCollapseAll: ActionHandler<{ type: "collapse.all" }> = (state, _action) => ({
  ...state,
  expandedFiles: new Set(),
})
