import type { AppState } from "../state"

export type EventHandler<T = unknown> = (state: AppState, properties: T) => AppState

export type EventHandlerChain = (state: AppState, eventType: string, properties: unknown) => AppState

export interface EventRegistry {
  [eventType: string]: EventHandler
}
