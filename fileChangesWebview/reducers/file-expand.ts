import type { ActionHandler } from "./types"

export const handleFileExpand: ActionHandler<{ type: "file.expand"; file: string }> = (
  state,
  action
) => {
  const newExpanded = new Set(state.expandedFiles)
  newExpanded.add(action.file)
  return { ...state, expandedFiles: newExpanded }
}
