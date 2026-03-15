import * as vscode from "vscode"
import { ChatProvider } from "./provider"
import { DiffContentProvider } from "./diffProvider"

export function activate(ctx: vscode.ExtensionContext): void {
  const diffProvider = new DiffContentProvider()
  const provider = new ChatProvider(ctx, diffProvider)

  ctx.subscriptions.push(
    vscode.window.registerWebviewViewProvider("opencode.chat", provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.workspace.registerTextDocumentContentProvider("opencode-diff", diffProvider),
    vscode.commands.registerCommand("opencode.newSession", () => provider.newSession()),
    vscode.commands.registerCommand("opencode.focus", () => {
      vscode.commands.executeCommand("opencode.chat.focus")
    }),
    vscode.commands.registerCommand("opencode.attachSelection", () => provider.attachSelection()),
    provider,
    diffProvider,
  )
}

export function deactivate(): void {}
