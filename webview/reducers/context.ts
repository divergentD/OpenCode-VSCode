import type { AppState } from "../state"
import type { ActionHandler } from "./types"

export const handleContextResolved: ActionHandler<{
  kind: "selection" | "problems" | "terminal" | "files"
  payload: unknown
}> = (state, { kind, payload }) => ({
  ...state,
  contextResolved: { ...state.contextResolved, [kind]: payload },
})
