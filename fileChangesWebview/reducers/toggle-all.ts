import type { ActionHandler } from "./types"

export const handleToggleAll: ActionHandler<{ type: "toggle.all" }> = (state, _action) => {
  const allExpanded = state.expandedFiles.size === state.diffs.length
  return {
    ...state,
    expandedFiles: allExpanded ? new Set() : new Set(state.diffs.map((d) => (d as { file: string }).file)),
  }
}
