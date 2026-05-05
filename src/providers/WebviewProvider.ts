import * as vscode from "vscode"
import * as crypto from "crypto"

export type HostMessage = { type: string; [key: string]: unknown }

export class WebviewProvider {
  private view?: vscode.WebviewView
  private postMessageCallback?: (msg: HostMessage) => void
  private disposables: vscode.Disposable[] = []

  constructor(private ctx: vscode.ExtensionContext) {}

  public resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.ctx.extensionUri],
    }
    view.webview.html = this.getHtml(view.webview)
  }

  public setOnDidReceiveMessage(callback: (msg: unknown) => void): vscode.Disposable | undefined {
    const disposable = this.view?.webview.onDidReceiveMessage(callback)
    if (disposable) {
      this.disposables.push(disposable)
    }
    return disposable
  }

  public setPostMessageCallback(callback: (msg: HostMessage) => void): void {
    this.postMessageCallback = callback
  }

  public post(msg: HostMessage): void {
    this.view?.webview.postMessage(msg)
    this.postMessageCallback?.(msg)
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = crypto.randomBytes(16).toString("hex")
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.ctx.extensionUri, "dist", "webview.js"))
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.ctx.extensionUri, "dist", "webview.css"))
    const cspSource = webview.cspSource
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${cspSource} data:; connect-src ${cspSource} https://models.dev;">
  <link rel="stylesheet" href="${styleUri}">
<title>opencode Chat</title>
</head>
<body>
<div id="root"></div>
<script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`
  }

  public hasView(): boolean {
    return !!this.view
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose())
    this.disposables = []
    this.view = undefined
  }
}