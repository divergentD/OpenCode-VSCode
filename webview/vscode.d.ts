import type { WebviewMessage, HostMessage } from "../src/types"

interface VsCodeApi {
  postMessage(message: WebviewMessage): void
  getState(): unknown
  setState(state: unknown): void
}

declare function acquireVsCodeApi(): VsCodeApi

declare global {
  interface Window {
    acquireVsCodeApi: typeof acquireVsCodeApi
  }
}
