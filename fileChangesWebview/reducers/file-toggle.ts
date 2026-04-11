import type { ActionHandler } from "./types"

export const handleFileToggle: ActionHandler<{ type: "file.toggle"; file: string }> = (
  state,
  action
) => {
  const newExpanded = new Set(state.expandedFiles)
  if (newExpanded.has(action.file)) {
    newExpanded.delete(action.file)
  } else {
    newExpanded.add(action.file)
  }
  return { ...state, expandedFiles: newExpanded }
}
