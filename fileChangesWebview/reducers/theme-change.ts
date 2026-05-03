import type { ActionHandler } from "./types"
import type { AppState } from "../state"
import type { ThemeKind } from "../types"

export const handleThemeChange: ActionHandler<{
  type: "theme.changed"
  theme: { kind: ThemeKind }
}> = (state, action) => ({
  ...state,
  theme: action.theme.kind,
})
