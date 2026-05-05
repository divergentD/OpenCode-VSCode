import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs"
import type { MessageDispatcher } from "../managers/MessageDispatcher"
import type { WebviewMessage } from "../types"
import type { Command } from "./types"

export class FileOpenCommand implements Command {
  readonly type = "file.open"

  async execute(dispatcher: MessageDispatcher, msg: WebviewMessage & { path: string; line?: number; column?: number }): Promise<void> {
    const directory = dispatcher.getDirectory()
    if (!directory || !msg.path) {
      console.log("[FileOpenCommand] file.open: missing directory or path")
      return
    }
    const openFilePath = path.isAbsolute(msg.path) ? msg.path : path.join(directory, msg.path)
    console.log("[FileOpenCommand] file.open: opening file at", openFilePath)
    
    // Check if file exists
    if (!fs.existsSync(openFilePath)) {
      console.error("[FileOpenCommand] file.open: file does not exist", openFilePath)
      vscode.window.showErrorMessage(`File does not exist: ${msg.path}`)
      return
    }
    
    const openUri = vscode.Uri.file(openFilePath)
    const openOptions: vscode.TextDocumentShowOptions = {
      preview: true,
    }
    if (msg.line !== undefined && msg.line >= 0) {
      openOptions.selection = new vscode.Range(msg.line, msg.column ?? 0, msg.line, msg.column ?? 0)
    }
    
    console.log("[FileOpenCommand] file.open: calling openTextDocument")
    try {
      const doc = await vscode.workspace.openTextDocument(openUri)
      console.log("[FileOpenCommand] file.open: document opened, calling showTextDocument")
      const editor = await vscode.window.showTextDocument(doc, openOptions)
      console.log("[FileOpenCommand] file.open: file opened successfully in editor")
      // Focus the editor
      await vscode.commands.executeCommand("workbench.action.focusActiveEditorGroup")
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("[FileOpenCommand] file.open: error", message)
      vscode.window.showErrorMessage(`Cannot open file: ${message}`)
    }
  }
}
