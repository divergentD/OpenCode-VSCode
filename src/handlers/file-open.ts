import * as vscode from "vscode"
import * as path from "path"
import type { FileChangesPanelProvider } from "../FileChangesPanelProvider"

export function handleFileOpen(
  provider: FileChangesPanelProvider,
  msg: { type: string; path?: string; line?: number }
): void {
  if (!msg.path) return

  const folders = vscode.workspace.workspaceFolders
  const directory = folders?.[0]?.uri.fsPath

  if (!directory) return

  const fullPath = path.isAbsolute(msg.path) ? msg.path : path.join(directory, msg.path)
  const uri = vscode.Uri.file(fullPath)

  const options: vscode.TextDocumentShowOptions = {
    preview: true,
  }

  if (msg.line !== undefined && msg.line >= 0) {
    options.selection = new vscode.Range(msg.line, 0, msg.line, 0)
  }

  vscode.workspace.openTextDocument(uri).then((doc) => {
    vscode.window.showTextDocument(doc, options)
  })
}
