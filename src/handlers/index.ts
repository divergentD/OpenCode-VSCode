import type { FileChangesPanelProvider } from "../FileChangesPanelProvider"
import { handleFileOpen } from "./file-open"
import { handleFileDiff } from "./file-diff"

export type MessageHandler<T = Record<string, unknown>> = (
  provider: FileChangesPanelProvider,
  msg: T
) => void

export const messageHandlers: Record<string, MessageHandler> = {
  "file.open": handleFileOpen as MessageHandler,
  "file.diff": handleFileDiff as MessageHandler,
}
