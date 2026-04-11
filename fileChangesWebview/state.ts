import type { FileDiff } from "./types"
import { actionRegistry } from "./reducers"

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
  const handler = actionRegistry[action.type]
  return handler ? handler(state, action) : state
}
