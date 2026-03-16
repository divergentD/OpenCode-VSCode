import React from "react"
import { createRoot } from "react-dom/client"
import { FileChangesApp } from "./FileChangesApp"

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
