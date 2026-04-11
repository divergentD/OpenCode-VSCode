import type { AppState } from "../state"
import type { ActionHandler } from "./types"

export const handleServerReady: ActionHandler = (state) => ({
  ...state,
  connected: true,
  serverError: null,
})

export const handleServerError: ActionHandler<{ message: string }> = (state, { message }) => ({
  ...state,
  connected: false,
  serverError: message,
})
