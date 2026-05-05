import React, { useState } from "react"
import type { AppState, Action } from "../state"
import type { WebviewMessage } from "../types"
import { MessageList } from "./MessageList"
import { PromptInput } from "./PromptInput"
import { SessionDrawer } from "./SessionDrawer"
import { TodoList } from "./TodoList"
import "./ChatPanel.css"

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
  const isSubSession = !!activeSession?.parentID

  const handleAbort = () => {
    if (state.activeSessionID) {
      post({ type: "session.abort", sessionID: state.activeSessionID })
    }
  }

  const handleReturnToParent = () => {
    if (activeSession?.parentID) {
      post({ type: "session.select", sessionID: activeSession.parentID })
    }
  }

  const handleBreadcrumbClick = (sessionID: string) => {
    post({ type: "session.select", sessionID })
  }

  return (
    <div className="chat-panel">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="top-bar-left">
          <div className="logo-icon">O</div>
          {state.sessionBreadcrumb.length > 1 ? (
            <div className="breadcrumb-trail">
              {state.sessionBreadcrumb.map((session, index) => (
                <React.Fragment key={session.id}>
                  {index > 0 && <span className="breadcrumb-separator">›</span>}
                  <button
                    className={`breadcrumb-item ${session.id === state.activeSessionID ? "active" : ""}`}
                    onClick={() => handleBreadcrumbClick(session.id)}
                    title={session.title}
                  >
                    {session.title || "Untitled"}
                  </button>
                </React.Fragment>
              ))}
            </div>
          ) : (
            <span className="brand-name">{activeSession?.title || "New Chat"}</span>
          )}
        </div>
        <div className="top-bar-right">
          {isSubSession && (
            <button 
              className="btn-return-parent" 
              onClick={handleReturnToParent}
              title="Back to parent session"
            >
              ← Back
            </button>
          )}
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
        fileChanges={state.activeSessionID ? (state.fileChanges[state.activeSessionID] ?? []) : []}
        post={post}
        agents={state.agents}
      />

      <TodoList
        todos={state.activeSessionID ? (state.todos[state.activeSessionID] ?? []) : []}
        sessionID={state.activeSessionID}
        post={post}
        isVisible={!!state.activeSessionID}
      />

      {/* Input Area */}
      <div className="input-container">
        {/* Thinking Indicator */}
        {activeStatus === "busy" && (
          <div className="thinking-indicator">
            <div className="thinking-spinner" />
            <span className="thinking-text">思考中</span>
            <button className="btn-stop" onClick={handleAbort} title="停止">
              ⏹
            </button>
          </div>
        )}
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