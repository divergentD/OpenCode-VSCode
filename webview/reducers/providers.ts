import type { AppState } from "../state"
import type { ProviderInfo } from "../types"
import type { ActionHandler } from "./types"

export const handleProvidersList: ActionHandler<{
  providers: ProviderInfo[]
  default?: Record<string, string>
  connected?: string[]
}> = (state, { providers, connected }) => {
  const connectedProviders = connected
    ? providers.filter((p) => connected!.includes(p.id))
    : providers

  return {
    ...state,
    providers: connectedProviders,
  }
}
