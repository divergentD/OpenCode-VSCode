import React, { useEffect, useReducer, useCallback } from "react"
import { reducer, initialState } from "./state"
import type { HostMessage } from "./types"
import { FileChangesPanel } from "./components/FileChangesPanel"

type Props = {
  vscode: {
    postMessage: (msg: unknown) => void
    getState: () => unknown
    setState: (s: unknown) => void
  }
}

export function FileChangesApp({ vscode }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data as HostMessage
      console.log("[FileChanges] Received message:", msg.type, msg)

      switch (msg.type) {
        case "init":
          dispatch({ type: "init", sessionID: msg.sessionID, diffs: msg.diffs })
          break
        case "update":
          dispatch({ type: "update", sessionID: msg.sessionID, diffs: msg.diffs })
          break
      }
    }

    window.addEventListener("message", handleMessage)
    vscode.postMessage({ type: "ready" })

    return () => window.removeEventListener("message", handleMessage)
  }, [vscode])

  const post = useCallback(
    (msg: unknown) => vscode.postMessage(msg),
    [vscode]
  )

  const handleFileOpen = useCallback(
    (path: string, line?: number) => {
      post({ type: "file.open", path, line })
    },
    [post]
  )

  const handleShowDiff = useCallback(
    (path: string, before: string, after: string) => {
      post({ type: "file.diff", path, before, after })
    },
    [post]
  )

  return (
    <FileChangesPanel
      sessionID={state.sessionID}
      diffs={state.diffs}
      expandedFiles={state.expandedFiles}
      onFileToggle={(file) => dispatch({ type: "file.toggle", file })}
      onFileOpen={handleFileOpen}
      onShowDiff={handleShowDiff}
      onToggleAll={() => dispatch({ type: "toggle.all" })}
    />
  )
}
