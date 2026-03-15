import React, { useState } from "react"
import type { AppState, Action } from "../state"
import type { WebviewMessage } from "../types"
import { MessageList } from "./MessageList"
import { PromptInput } from "./PromptInput"
import { SessionDrawer } from "./SessionDrawer"

type Props = {
  state: AppState
  dispatch: React.Dispatch<Action>
  post: (msg: WebviewMessage) => void
}

export function ChatPanel({ state, dispatch, post }: Props) {
  const [showSessions, setShowSessions] = useState(false)

  const activeStatus = state.activeSessionID ? (state.sessionStatuses[state.activeSessionID] ?? "idle") : "idle"

  const messages = state.activeSessionID ? (state.messages[state.activeSessionID] ?? []) : []

  const activeSession = state.sessions.find((s) => s.id === state.activeSessionID)

  return (
    <div className="chat-panel">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="top-bar-left">
          <div className="logo-icon">O</div>
          <span className="brand-name">opencode</span>
        </div>
        <div className="top-bar-right">
          <button className="btn-dropdown" onClick={() => setShowSessions(!showSessions)}>
            History
            <span>▼</span>
          </button>
          <button className="btn-new-chat" onClick={() => post({ type: "session.create" })} title="New Chat">
            +
          </button>
        </div>
      </div>

      {/* Session Drawer */}
      {showSessions && (
        <SessionDrawer
          sessions={state.sessions}
          activeSessionID={state.activeSessionID}
          sessionStatuses={state.sessionStatuses}
          onSelect={(id) => {
            post({ type: "session.select", sessionID: id })
            setShowSessions(false)
          }}
          onDelete={(id) => post({ type: "session.delete", sessionID: id })}
          onNew={() => {
            post({ type: "session.create" })
            setShowSessions(false)
          }}
          onClose={() => setShowSessions(false)}
        />
      )}

      {/* Message List */}
      <MessageList
        messages={messages}
        partDeltas={state.partDeltas}
        permissions={state.permissions}
        questions={state.questions}
        sessionStatus={activeStatus}
        hasSession={!!state.activeSessionID}
        post={post}
      />

      {/* Input Area */}
      <div className="input-container">
        <PromptInput
          disabled={activeStatus === "busy"}
          contextResolved={state.contextResolved}
          post={post}
          sessionID={state.activeSessionID}
          commands={state.commands}
          agents={state.agents}
          providers={state.providers}
          selectedAgent={state.selectedAgent}
          selectedModel={state.selectedModel}
          onAgentSelect={(agentID) => dispatch({ type: "agent.select", agentID })}
          onModelSelect={(modelID) => dispatch({ type: "model.select", modelID })}
        />
      </div>
    </div>
  )
}
