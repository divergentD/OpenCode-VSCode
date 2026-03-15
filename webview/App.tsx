import React, { useReducer, useEffect, useCallback } from "react"
import { reducer, initialState, type Action } from "./state"
import type { HostMessage, WebviewMessage } from "./types"
import { ChatPanel } from "./components/ChatPanel"

declare function acquireVsCodeApi(): {
  postMessage(msg: WebviewMessage): void
  getState(): unknown
  setState(s: unknown): void
}

const vscode = acquireVsCodeApi()

export function App() {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    function handle(event: MessageEvent) {
      const msg = event.data as HostMessage
      console.log("[opencode webview] Received message:", msg.type, msg)
      switch (msg.type) {
        case "server.ready":
          dispatch({ type: "server.ready" })
          break
        case "server.error":
          dispatch({ type: "server.error", message: msg.message })
          break
        case "workspace.missing":
          dispatch({ type: "workspace.missing" })
          break
        case "sessions.list":
          dispatch({ type: "sessions.list", sessions: msg.sessions })
          break
        case "session.created":
          dispatch({ type: "session.created", session: msg.session })
          break
        case "session.deleted":
          dispatch({ type: "session.deleted", sessionID: msg.sessionID })
          break
        case "messages.list":
          dispatch({ type: "messages.list", sessionID: msg.sessionID, messages: msg.messages })
          break
        case "event":
          dispatch({ type: "event", event: msg.event })
          break
        case "context.resolved":
          dispatch({ type: "context.resolved", kind: msg.kind, payload: msg.payload })
          break
        case "commands.list":
          console.log('[App] Received commands.list with', msg.commands.length, 'commands')
          dispatch({ type: "commands.list", commands: msg.commands })
          break
        case "providers.list":
          // Ensure providers is always an array
          const providers = Array.isArray(msg.providers) ? msg.providers : []
          dispatch({ type: "providers.list", providers, default: msg.default, connected: msg.connected })
          break
        case "agents.list":
          dispatch({ type: "agents.list", agents: msg.agents })
          break
        case "config.get":
          dispatch({ type: "config.get", config: msg.config })
          break
        case "session.diff":
          dispatch({ type: "session.diff", sessionID: msg.sessionID, diffs: msg.diffs })
          break
      }
    }
    window.addEventListener("message", handle)
    vscode.postMessage({ type: "ready" })
    vscode.postMessage({ type: "commands.list.request" })
    vscode.postMessage({ type: "providers.list.request" })
    vscode.postMessage({ type: "agents.list.request" })
    return () => window.removeEventListener("message", handle)
  }, [])

  const post = useCallback((msg: WebviewMessage) => vscode.postMessage(msg), [])

  if (state.workspaceMissing) {
    return (
      <div className="state-screen">
        <div className="state-icon">📁</div>
        <p>Open a folder to use opencode Chat</p>
      </div>
    )
  }

  if (!state.connected && state.serverError) {
    return (
      <div className="state-screen">
        <div className="state-icon error">⚠</div>
        <p>Failed to connect to opencode</p>
        <p className="state-detail">{state.serverError}</p>
        <button onClick={() => vscode.postMessage({ type: "ready" })}>Retry</button>
      </div>
    )
  }

  if (!state.connected) {
    return (
      <div className="state-screen">
        <div className="state-spinner" />
        <p>Connecting to opencode…</p>
      </div>
    )
  }

  return <ChatPanel state={state} dispatch={dispatch} post={post} />
}
