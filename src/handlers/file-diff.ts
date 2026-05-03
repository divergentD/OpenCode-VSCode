import * as vscode from "vscode"
import * as path from "path"
import type { FileChangesPanelProvider } from "../FileChangesPanelProvider"
import { extractBeforeAfterFromPatch } from "../patch"

export function handleFileDiff(
  provider: FileChangesPanelProvider,
  msg: { type: string; path?: string; before?: string; after?: string; patch?: string }
): void {
  if (!msg.path) return

  let before = msg.before
  let after = msg.after

  if ((before === undefined || after === undefined) && msg.patch) {
    const extracted = extractBeforeAfterFromPatch(msg.patch)
    before = extracted.before
    after = extracted.after
  }

  if (before === undefined || after === undefined) return

  console.log("[FileChangesPanelProvider] Showing diff for:", msg.path)

  const folders = vscode.workspace.workspaceFolders
  const directory = folders?.[0]?.uri.fsPath

  if (!directory) {
    console.error("[FileChangesPanelProvider] No workspace folder found")
    return
  }

  const fullPath = path.isAbsolute(msg.path) ? msg.path : path.join(directory, msg.path)

  const beforeUri = vscode.Uri.from({
    scheme: "opencode-diff",
    authority: "before",
    path: fullPath,
  })
  const afterUri = vscode.Uri.from({
    scheme: "opencode-diff",
    authority: "after",
    path: fullPath,
  })

  const diffProvider = (provider as unknown as { diffProvider: { setContent: (uri: vscode.Uri, content: string) => void } }).diffProvider
  diffProvider.setContent(beforeUri, msg.before || "")
  diffProvider.setContent(afterUri, msg.after || "")

  vscode.commands
    .executeCommand("vscode.diff", beforeUri, afterUri, `${path.basename(msg.path)} (Changes)`)
    .then(
      () => {
        console.log("[FileChangesPanelProvider] Diff shown successfully")
      },
      (err: Error) => {
        console.error("[FileChangesPanelProvider] Error showing diff:", err)
        vscode.window.showErrorMessage(`无法显示差异: ${err.message}`)
      }
    )
}
