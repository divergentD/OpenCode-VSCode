import type { AppState } from "../state"
import type { CommandInfo } from "../types"
import type { ActionHandler } from "./types"

export const handleCommandsList: ActionHandler<{ commands: CommandInfo[] }> = (
  state,
  { commands }
) => ({
  ...state,
  commands,
})
