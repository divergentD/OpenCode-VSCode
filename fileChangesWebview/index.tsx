import React from "react"
import { createRoot } from "react-dom/client"
import { FileChangesApp } from "./FileChangesApp"
import { VSCodeThemeProvider } from "../packages/ui/src/theme/VSCodeThemeProvider"
import "../packages/ui/src/file-diff/FileDiff.css"

declare function acquireVsCodeApi(): {
  postMessage(msg: unknown): void
  getState(): unknown
  setState(s: unknown): void
}

const vscode = acquireVsCodeApi()
const container = document.getElementById("root")

if (container) {
  const root = createRoot(container)
  root.render(
    <VSCodeThemeProvider>
      <FileChangesApp vscode={vscode} />
    </VSCodeThemeProvider>
  )
}
