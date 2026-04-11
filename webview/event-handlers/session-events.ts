import type { AppState } from "../state"
import type { SessionInfo, SessionStatus, FileDiff } from "../types"
import type { EventHandler } from "./types"

export const handleSessionStatus: EventHandler<{
  sessionID: string
  status: SessionStatus | { type: SessionStatus }
}> = (state, { sessionID, status }) => {
  const statusValue: SessionStatus =
    typeof status === "string" ? status : (status as { type: SessionStatus }).type
  return {
    ...state,
    sessionStatuses: { ...state.sessionStatuses, [sessionID]: statusValue },
  }
}

export const handleSessionUpdated: EventHandler<{ info: SessionInfo }> = (
  state,
  { info }
) => {
  const sessions = state.sessions.map((s) => (s.id === info.id ? info : s))
  return { ...state, sessions }
}

export const handleSessionDiff: EventHandler<{
  sessionID: string
  diff: FileDiff[]
}> = (state, { sessionID, diff }) => ({
  ...state,
  fileChanges: {
    ...state.fileChanges,
    [sessionID]: diff,
  },
})