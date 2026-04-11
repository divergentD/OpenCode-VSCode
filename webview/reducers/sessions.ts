import type { AppState } from "../state"
import type { SessionInfo } from "../types"
import type { ActionHandler } from "./types"

export const handleSessionsList: ActionHandler<{ sessions: SessionInfo[] }> = (
  state,
  { sessions }
) => ({
  ...state,
  sessions,
})

export const handleSessionCreated: ActionHandler<{ session: SessionInfo }> = (
  state,
  { session }
) => ({
  ...state,
  sessions: [...state.sessions.filter((s) => s.id !== session.id), session],
  activeSessionID: session.id,
})

export const handleSessionDeleted: ActionHandler<{ sessionID: string }> = (
  state,
  { sessionID }
) => ({
  ...state,
  sessions: state.sessions.filter((s) => s.id !== sessionID),
  activeSessionID: state.activeSessionID === sessionID ? null : state.activeSessionID,
})
