import type { ActionHandler } from "./types"

export const handleFileCollapse: ActionHandler<{ type: "file.collapse"; file: string }> = (
  state,
  action
) => {
  const newExpanded = new Set(state.expandedFiles)
  newExpanded.delete(action.file)
  return { ...state, expandedFiles: newExpanded }
}
