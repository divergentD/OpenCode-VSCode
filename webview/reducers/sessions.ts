import type { AppState } from "../state"
import type { SessionInfo } from "../types"
import type { ActionHandler } from "./types"

export function buildBreadcrumb(sessions: SessionInfo[], sessionID: string): SessionInfo[] {
  const breadcrumb: SessionInfo[] = []
  let current = sessions.find((s) => s.id === sessionID)

  while (current) {
    breadcrumb.unshift(current)
    if (current.parentID) {
      current = sessions.find((s) => s.id === current!.parentID)
    } else {
      break
    }
  }

  return breadcrumb
}

export const handleSessionsList: ActionHandler<{ sessions: SessionInfo[] }> = (
  state,
  { sessions }
) => {
  const sessionBreadcrumb = state.activeSessionID
    ? buildBreadcrumb(sessions, state.activeSessionID)
    : []

  return {
    ...state,
    sessions,
    sessionBreadcrumb,
  }
}

export const handleSessionCreated: ActionHandler<{ session: SessionInfo }> = (
  state,
  { session }
) => {
  const newSessions = [...state.sessions.filter((s) => s.id !== session.id), session]
  const sessionBreadcrumb = buildBreadcrumb(newSessions, session.id)

  return {
    ...state,
    sessions: newSessions,
    activeSessionID: session.id,
    sessionBreadcrumb,
    messages: {
      ...state.messages,
      [session.id]: state.messages[session.parentID || ""] || [],
    },
  }
}

export const handleSessionDeleted: ActionHandler<{ sessionID: string }> = (
  state,
  { sessionID }
) => {
  const idsToRemove = new Set<string>([sessionID])

  const findDescendants = (parentId: string) => {
    state.sessions
      .filter((s) => s.parentID === parentId)
      .forEach((child) => {
        idsToRemove.add(child.id)
        findDescendants(child.id)
      })
  }
  findDescendants(sessionID)

  const filteredSessions = state.sessions.filter((s) => !idsToRemove.has(s.id))

  let newActiveID = state.activeSessionID
  let newBreadcrumb = state.sessionBreadcrumb

  if (idsToRemove.has(state.activeSessionID || "")) {
    const deletedSession = state.sessions.find((s) => s.id === sessionID)
    newActiveID = deletedSession?.parentID || null
    newBreadcrumb = newActiveID ? buildBreadcrumb(filteredSessions, newActiveID) : []
  }

  return {
    ...state,
    sessions: filteredSessions,
    activeSessionID: newActiveID,
    sessionBreadcrumb: newBreadcrumb,
    messages: Object.fromEntries(
      Object.entries(state.messages).filter(([id]) => !idsToRemove.has(id))
    ),
  }
}

export const handleBreadcrumbUpdate: ActionHandler<{ breadcrumb: SessionInfo[] }> = (
  state,
  { breadcrumb }
) => ({
  ...state,
  sessionBreadcrumb: breadcrumb,
})
