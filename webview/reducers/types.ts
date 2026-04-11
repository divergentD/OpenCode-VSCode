import type { AppState } from "../state"

export type ActionHandler<T = unknown> = (state: AppState, payload: T) => AppState

export interface ActionRegistry {
  [actionType: string]: ActionHandler
}
