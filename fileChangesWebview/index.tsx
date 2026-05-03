import React from "react"
import { createRoot } from "react-dom/client"
import { FileChangesApp } from "./FileChangesApp"
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
  root.render(<FileChangesApp vscode={vscode} />)
}
