import * as vscode from "vscode"

export class DiffContentProvider implements vscode.TextDocumentContentProvider {
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>()
  onDidChange = this._onDidChange.event

  // Store the content for each URI
  private contents = new Map<string, string>()

  provideTextDocumentContent(uri: vscode.Uri): string {
    const key = uri.toString()
    return this.contents.get(key) || ""
  }

  setContent(uri: vscode.Uri, content: string): void {
    const key = uri.toString()
    this.contents.set(key, content)
    this._onDidChange.fire(uri)
  }

  clearContent(uri: vscode.Uri): void {
    const key = uri.toString()
    this.contents.delete(key)
  }

  dispose(): void {
    this._onDidChange.dispose()
    this.contents.clear()
  }
}
