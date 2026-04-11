import type { AppState } from "../state"
import type { PermissionRequest } from "../types"
import type { EventHandler } from "./types"

export const handlePermissionAsked: EventHandler<{
  id: string
  type: string
  metadata?: Record<string, unknown>
}> = (state, { id, type, metadata }) => {
  const req: PermissionRequest = {
    requestID: id,
    type,
    command: metadata?.command as string | undefined,
    path: metadata?.path as string | undefined,
    description: metadata?.description as string | undefined,
  }
  return {
    ...state,
    permissions: [...state.permissions, req],
  }
}

export const handlePermissionReplied: EventHandler<{ id: string }> = (
  state,
  { id }
) => ({
  ...state,
  permissions: state.permissions.filter((p) => p.requestID !== id),
})