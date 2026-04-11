import type { AppState } from "../state"
import type { Action } from "../state"

export type ActionHandler<T = Action> = (state: AppState, action: T) => AppState

export type ActionRegistry = Record<string, ActionHandler>
