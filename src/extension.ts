import * as vscode from "vscode"
import { ChatProvider } from "./provider"

export function activate(ctx: vscode.ExtensionContext): void {
  const provider = new ChatProvider(ctx)
  ctx.subscriptions.push(
    vscode.window.registerWebviewViewProvider("opencode.chat", provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand("opencode.newSession", () => provider.newSession()),
    vscode.commands.registerCommand("opencode.focus", () => {
      vscode.commands.executeCommand("opencode.chat.focus")
    }),
    vscode.commands.registerCommand("opencode.attachSelection", () => provider.attachSelection()),
    provider,
  )
}

export function deactivate(): void {}
