import * as vscode from "vscode"

export type SelectionContext = {
  text: string
  file: string
  range: string
}

export type ProblemContext = {
  file: string
  line: number
  severity: "error" | "warning" | "info"
  message: string
  source?: string
}

export class MentionResolver {
  private terminalBuffer = ""
  private disposables: vscode.Disposable[] = []

  constructor() {
    // Use stable onDidEndTerminalShellExecution (VSCode 1.93+)
    // to capture last command output instead of proposed terminalDataWriteEvent
    if (vscode.window.onDidEndTerminalShellExecution) {
      this.disposables.push(
        vscode.window.onDidEndTerminalShellExecution(async (event) => {
          try {
            const stream = event.execution.read()
            let output = ""
            for await (const data of stream) {
              output += data
              if (output.length > 4096) break
            }
            this.terminalBuffer = output.slice(-4096)
          } catch {
            // Shell integration not available — ignore
          }
        }),
      )
    }
  }

  resolveSelection(): SelectionContext | undefined {
    const editor = vscode.window.activeTextEditor
    if (!editor) return undefined

    const doc = editor.document
    const selection = editor.selection
    const relativePath = vscode.workspace.asRelativePath(doc.uri)

    if (selection.isEmpty) {
      return {
        text: doc.getText(),
        file: relativePath,
        range: "",
      }
    }

    const text = doc.getText(selection)
    const start = selection.start.line + 1
    const end = selection.end.line + 1
    const range = start === end ? `L${start}` : `L${start}-${end}`

    return {
      text,
      file: relativePath,
      range,
    }
  }

  resolveProblems(): ProblemContext[] {
    const diagnostics = vscode.languages.getDiagnostics()
    const workspaceFolders = vscode.workspace.workspaceFolders
    if (!workspaceFolders) return []

    const workspaceUris = workspaceFolders.map((folder) => folder.uri.fsPath)
    const problems: ProblemContext[] = []

    for (const [uri, diagnosticArray] of diagnostics) {
      const filePath = uri.fsPath
      const isInWorkspace = workspaceUris.some((workspace) => filePath.startsWith(workspace))
      if (!isInWorkspace) continue

      const relativePath = vscode.workspace.asRelativePath(uri)

      for (const diagnostic of diagnosticArray) {
        const severity =
          diagnostic.severity === vscode.DiagnosticSeverity.Error
            ? "error"
            : diagnostic.severity === vscode.DiagnosticSeverity.Warning
              ? "warning"
              : "info"

        problems.push({
          file: relativePath,
          line: diagnostic.range.start.line + 1,
          severity,
          message: diagnostic.message,
          source: diagnostic.source,
        })
      }
    }

    problems.sort((a, b) => {
      const severityOrder = { error: 0, warning: 1, info: 2 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    })

    return problems.slice(0, 50)
  }

  resolveTerminal(): string {
    // Also try to get active terminal name for context
    const active = vscode.window.activeTerminal
    if (!this.terminalBuffer && active) {
      return `[Terminal: ${active.name}] (no captured output — shell integration may be required)`
    }
    return this.terminalBuffer
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose())
  }
}
