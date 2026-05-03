import * as vscode from "vscode"
import * as path from "path"
import type { ChatProvider } from "../provider"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"
import { extractBeforeAfterFromPatch } from "../patch"

export class FileDiffCommand implements Command {
  readonly type = "file.diff"

  async execute(provider: ChatProvider, msg: WebviewMessage & { path: string; before?: string; after?: string; patch?: string }): Promise<void> {
    const directory = provider["directory"]
    const diffProvider = provider["diffProvider"]
    if (!directory || !msg.path) {
      console.log("[provider] file.diff: missing directory or path")
      return
    }

    let before = msg.before
    let after = msg.after

    if ((before === undefined || after === undefined) && msg.patch) {
      const extracted = extractBeforeAfterFromPatch(msg.patch)
      before = extracted.before
      after = extracted.after
    }

    if (before === undefined || after === undefined) {
      console.log("[provider] file.diff: missing before/after content for", msg.path)
      return
    }

    const diffFilePath = path.isAbsolute(msg.path) ? msg.path : path.join(directory, msg.path)
    console.log("[provider] file.diff: showing diff for", diffFilePath)

    // Create URIs for diff view
    const beforeUri = vscode.Uri.from({
      scheme: "opencode-diff",
      authority: "before",
      path: diffFilePath
    })
    const afterUri = vscode.Uri.from({
      scheme: "opencode-diff",
      authority: "after",
      path: diffFilePath
    })

    // Set content for the URIs
    diffProvider.setContent(beforeUri, before || "")
    diffProvider.setContent(afterUri, after || "")

    vscode.commands.executeCommand(
      "vscode.diff",
      beforeUri,
      afterUri,
      `${msg.path} (Changes)`,
    ).then(() => {
      console.log("[provider] file.diff: diff shown successfully")
    }, (err: Error) => {
      console.error("[provider] file.diff: error showing diff", err)
      vscode.window.showErrorMessage(`无法显示差异: ${err.message}`)
    })
  }
}
