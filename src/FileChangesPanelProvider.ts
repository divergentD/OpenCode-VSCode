import * as vscode from "vscode"
import * as path from "path"
import * as crypto from "crypto"
import type { FileDiff } from "./types"
import { DiffContentProvider } from "./diffProvider"
import { messageHandlers } from "./handlers"

export type FileChangesMessage =
  | { type: "init"; sessionID: string; diffs: FileDiff[] }
  | { type: "update"; sessionID: string; diffs: FileDiff[] }

export class FileChangesPanelProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView
  private currentSessionID?: string
  private currentDiffs: FileDiff[] = []

  constructor(private ctx: vscode.ExtensionContext, private diffProvider: DiffContentProvider) {}

  async resolveWebviewView(view: vscode.WebviewView): Promise<void> {
    this.view = view

    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.ctx.extensionUri],
    }

    view.webview.html = this.getHtml(view.webview)

    view.webview.onDidReceiveMessage((msg: { type: string; path?: string; before?: string; after?: string; line?: number }) => {
      this.handleMessage(msg)
    })

    if (this.currentSessionID && this.currentDiffs.length > 0) {
      this.view.webview.postMessage({
        type: "init",
        sessionID: this.currentSessionID,
        diffs: this.currentDiffs,
      })
    }
  }

  public show(sessionID: string, diffs: FileDiff[]): void {
    this.currentSessionID = sessionID
    this.currentDiffs = diffs

    if (this.view) {
      this.view.webview.postMessage({
        type: "init",
        sessionID: sessionID,
        diffs: diffs,
      })
    }
  }

  public updateDiffs(sessionID: string, diffs: FileDiff[]): void {
    if (this.currentSessionID !== sessionID) {
      this.currentSessionID = sessionID
      this.currentDiffs = diffs
    } else {
      this.currentDiffs = diffs
    }

    if (this.view) {
      this.view.webview.postMessage({
        type: "update",
        sessionID: sessionID,
        diffs: diffs,
      })
    }
  }

  private handleMessage(msg: { type: string; path?: string; before?: string; after?: string; line?: number }): void {
    const handler = messageHandlers[msg.type]
    if (handler) {
      handler(this, msg as Record<string, unknown>)
    }
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = crypto.randomBytes(16).toString("hex")
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.ctx.extensionUri, "dist", "fileChangesWebview.js")
    )
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.ctx.extensionUri, "dist", "fileChangesWebview.css")
    )
    const cspSource = webview.cspSource

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${cspSource} data:;">
<title>File Changes</title>
<link rel="stylesheet" href="${styleUri}">
<style>
:root {
  --bg-primary: #0d1117;
  --bg-secondary: #161b22;
  --bg-tertiary: #21262d;
  --bg-hover: #30363d;
  --border-color: #30363d;
  --border-light: #21262d;
  --text-primary: #e6edf3;
  --text-secondary: #7d8590;
  --text-muted: #484f58;
  --accent-blue: #58a6ff;
  --accent-green: #3fb950;
  --accent-red: #f85149;
  --accent-purple: #a371f7;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #root {
  height: 100%;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-primary);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--bg-tertiary);
  border-radius: 4px;
  border: 2px solid var(--bg-primary);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--bg-hover);
}

/* File Changes Panel */
.file-changes-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
}

.file-changes-panel.empty {
  align-items: center;
  justify-content: center;
}

.empty-state {
  text-align: center;
  padding: 48px 32px;
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  box-shadow: var(--shadow-md);
}

.empty-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.empty-subtext {
  font-size: 13px;
  color: var(--text-secondary);
}

/* Panel Header - Glass Effect */
.panel-header {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  background: rgba(22, 27, 34, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
}

.panel-icon {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%);
  border-radius: var(--radius-sm);
  font-size: 12px;
}

.panel-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: 16px;
  font-size: 12px;
}

.file-count {
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.stat-additions {
  color: var(--accent-green);
  background: rgba(63, 185, 80, 0.15);
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 11px;
}

.stat-deletions {
  color: var(--accent-red);
  background: rgba(248, 81, 73, 0.15);
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 11px;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.panel-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.panel-btn:hover {
  background: var(--bg-hover);
  border-color: var(--border-color);
  color: var(--text-primary);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.panel-btn.toggle-btn {
  position: relative;
  overflow: hidden;
}

.panel-btn.toggle-btn .toggle-icon {
  display: inline-block;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.panel-btn.toggle-btn.expanded .toggle-icon {
  transform: rotate(180deg);
}

/* Panel Content */
.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

/* Collapsible File Diff - Modern Card */
.collapsible-file-diff {
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  margin-bottom: 10px;
  overflow: hidden;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--shadow-sm);
}

.collapsible-file-diff:hover {
  border-color: var(--border-color);
  box-shadow: var(--shadow-md);
}

.collapsible-file-diff.expanded {
  border-color: var(--accent-blue);
}

.file-diff-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: transparent;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
}

.file-diff-header:hover {
  background: rgba(48, 54, 61, 0.4);
}

.file-diff-toggle {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  color: var(--text-secondary);
  transition: transform 0.2s ease;
}

.collapsible-file-diff.expanded .file-diff-toggle {
  transform: rotate(90deg);
}

.file-diff-name {
  font-family: "SF Mono", Monaco, "Cascadia Code", monospace;
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 600;
  letter-spacing: -0.2px;
}

.file-diff-path {
  font-family: "SF Mono", Monaco, "Cascadia Code", monospace;
  font-size: 11px;
  color: var(--text-muted);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-diff-stats {
  display: flex;
  gap: 6px;
  margin-right: 8px;
}

.file-diff-add {
  color: var(--accent-green);
  font-family: "SF Mono", Monaco, monospace;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  background: rgba(63, 185, 80, 0.12);
  border-radius: 4px;
}

.file-diff-del {
  color: var(--accent-red);
  font-family: "SF Mono", Monaco, monospace;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  background: rgba(248, 81, 73, 0.12);
  border-radius: 4px;
}

.file-diff-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.file-diff-header:hover .file-diff-actions {
  opacity: 1;
}

.file-diff-btn {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-light);
  cursor: pointer;
  font-size: 13px;
  padding: 5px 8px;
  border-radius: var(--radius-sm);
  opacity: 0.7;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.file-diff-btn:hover {
  opacity: 1;
  background: var(--bg-hover);
  border-color: var(--border-color);
  transform: translateY(-1px);
}

/* Diff Content - @pierre/diffs container */
.file-diff-content {
  border-top: 1px solid var(--border-light);
  max-height: 600px;
  overflow: auto;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 600px; }
}

/* @pierre/diffs styling */
.pierre-diff {
  font-size: 12px;
}

.pierre-diff pre {
  margin: 0;
}
</style>
</head>
<body>
<div id="root"></div>
<script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`
  }

  public dispose(): void {
    // No-op for WebviewViewProvider
  }
}
