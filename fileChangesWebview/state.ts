import type { FileDiff } from "./types"

export type AppState = {
  sessionID: string | null
  diffs: FileDiff[]
  expandedFiles: Set<string>
}

export const initialState: AppState = {
  sessionID: null,
  diffs: [],
  expandedFiles: new Set(),
}

export type Action =
  | { type: "init"; sessionID: string; diffs: FileDiff[] }
  | { type: "update"; sessionID: string; diffs: FileDiff[] }
  | { type: "file.toggle"; file: string }
  | { type: "file.expand"; file: string }
  | { type: "file.collapse"; file: string }
  | { type: "expand.all" }
  | { type: "collapse.all" }
  | { type: "toggle.all" }

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "init":
      return {
        sessionID: action.sessionID,
        diffs: action.diffs,
        expandedFiles: new Set(),
      }

    case "update":
      return {
        ...state,
        sessionID: action.sessionID,
        diffs: action.diffs,
      }

    case "file.toggle": {
      const newExpanded = new Set(state.expandedFiles)
      if (newExpanded.has(action.file)) {
        newExpanded.delete(action.file)
      } else {
        newExpanded.add(action.file)
      }
      return { ...state, expandedFiles: newExpanded }
    }

    case "file.expand": {
      const newExpanded = new Set(state.expandedFiles)
      newExpanded.add(action.file)
      return { ...state, expandedFiles: newExpanded }
    }

    case "file.collapse": {
      const newExpanded = new Set(state.expandedFiles)
      newExpanded.delete(action.file)
      return { ...state, expandedFiles: newExpanded }
    }

    case "expand.all":
      return {
        ...state,
        expandedFiles: new Set(state.diffs.map((d) => d.file)),
      }

    case "collapse.all":
      return { ...state, expandedFiles: new Set() }

    case "toggle.all": {
      const allExpanded = state.expandedFiles.size === state.diffs.length
      return {
        ...state,
        expandedFiles: allExpanded ? new Set() : new Set(state.diffs.map((d) => d.file)),
      }
    }

    default:
      return state
  }
}
