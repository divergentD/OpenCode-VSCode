import * as vscode from "vscode"
import * as path from "path"
import type { ChatProvider } from "../provider"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class FileOpenCommand implements Command {
  readonly type = "file.open"

  async execute(provider: ChatProvider, msg: WebviewMessage & { path: string; line?: number; column?: number }): Promise<void> {
    const directory = provider["directory"]
    if (!directory || !msg.path) {
      console.log("[provider] file.open: missing directory or path")
      return
    }
    const openFilePath = path.isAbsolute(msg.path) ? msg.path : path.join(directory, msg.path)
    console.log("[provider] file.open: opening file at", openFilePath)
    
    // Check if file exists
    const fs = require("fs")
    if (!fs.existsSync(openFilePath)) {
      console.error("[provider] file.open: file does not exist", openFilePath)
      vscode.window.showErrorMessage(`文件不存在: ${msg.path}`)
      return
    }
    
    const openUri = vscode.Uri.file(openFilePath)
    const openOptions: vscode.TextDocumentShowOptions = {
      preview: true,
    }
    if (msg.line !== undefined && msg.line >= 0) {
      openOptions.selection = new vscode.Range(msg.line, msg.column ?? 0, msg.line, msg.column ?? 0)
    }
    
    console.log("[provider] file.open: calling openTextDocument")
    vscode.workspace.openTextDocument(openUri).then((doc: vscode.TextDocument) => {
      console.log("[provider] file.open: document opened, calling showTextDocument")
      return vscode.window.showTextDocument(doc, openOptions)
    }).then((editor: vscode.TextEditor) => {
      console.log("[provider] file.open: file opened successfully in editor")
      // Focus the editor
      vscode.commands.executeCommand("workbench.action.focusActiveEditorGroup")
    }, (err: Error) => {
      console.error("[provider] file.open: error", err)
      vscode.window.showErrorMessage(`无法打开文件: ${err.message}`)
    })
  }
}
