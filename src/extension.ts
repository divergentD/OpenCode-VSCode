import * as vscode from "vscode"
import { ChatProvider } from "./provider"
import { DiffContentProvider } from "./diffProvider"
import { FileChangesPanelProvider } from "./FileChangesPanelProvider"

export function activate(ctx: vscode.ExtensionContext): void {
  const diffProvider = new DiffContentProvider()
  const fileChangesProvider = new FileChangesPanelProvider(ctx, diffProvider)
  const provider = new ChatProvider(ctx, diffProvider, fileChangesProvider)

  ctx.subscriptions.push(
    vscode.window.registerWebviewViewProvider("opencode.chat", provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.window.registerWebviewViewProvider("opencode.fileChanges", fileChangesProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.workspace.registerTextDocumentContentProvider("opencode-diff", diffProvider),
    vscode.commands.registerCommand("opencode.newSession", () => provider.newSession()),
    vscode.commands.registerCommand("opencode.focus", () => {
      vscode.commands.executeCommand("opencode.chat.focus")
    }),
    vscode.commands.registerCommand("opencode.attachSelection", () => provider.attachSelection()),
    vscode.commands.registerCommand("opencode.showFileChanges", () => {
      vscode.commands.executeCommand("workbench.action.focusAuxiliaryBar")
      vscode.commands.executeCommand("opencode.fileChanges.focus")
    }),
    provider,
    diffProvider,
    fileChangesProvider,
  )
}

export function deactivate(): void {}
