import React, { useReducer, useEffect, useCallback, useState } from "react"
import { reducer, initialState, type Action } from "./state"
import type { HostMessage, WebviewMessage } from "./types"
import { ChatPanel } from "./components/ChatPanel"
import "./App.css"

declare function acquireVsCodeApi(): {
  postMessage(msg: WebviewMessage): void
  getState(): unknown
  setState(s: unknown): void
}

const vscode = acquireVsCodeApi()

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[App] React error boundary caught:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="state-screen">
          <div className="state-icon error">⚠</div>
          <p>Something went wrong</p>
          <p className="state-detail">{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function handle(event: MessageEvent) {
      try {
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
          case "theme.changed":
            document.body.setAttribute("data-theme", msg.theme.kind)
            break
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error("[App] Error handling message:", message)
        setError(message)
      }
    }
    window.addEventListener("message", handle)
    vscode.postMessage({ type: "ready" })
    vscode.postMessage({ type: "commands.list.request" })
    vscode.postMessage({ type: "providers.list.request" })
    vscode.postMessage({ type: "agents.list.request" })
    return () => window.removeEventListener("message", handle)
  }, [])

  const post = useCallback((msg: WebviewMessage) => {
    try {
      vscode.postMessage(msg)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("[App] Error posting message:", message)
      setError(message)
    }
  }, [])

  if (error) {
    return (
      <div className="state-screen">
        <div className="state-icon error">⚠</div>
        <p>An error occurred</p>
        <p className="state-detail">{error}</p>
        <button onClick={() => setError(null)}>Dismiss</button>
      </div>
    )
  }

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

  return (
    <ErrorBoundary>
      <ChatPanel state={state} dispatch={dispatch} post={post} />
    </ErrorBoundary>
  )
}
