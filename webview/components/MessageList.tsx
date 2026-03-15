import React, { useRef, useEffect } from "react"
import type { MessageInfo, PermissionRequest, QuestionRequest, SessionStatus } from "../types"
import type { WebviewMessage } from "../types"
import { MessageBubble } from "./MessageBubble"
import { PermissionDialog } from "./PermissionDialog"
import { QuestionDialog } from "./QuestionDialog"

type Props = {
  messages: MessageInfo[]
  partDeltas: Record<string, string>
  permissions: PermissionRequest[]
  questions: QuestionRequest[]
  sessionStatus: SessionStatus
  hasSession: boolean
  post: (msg: WebviewMessage) => void
}

export function MessageList({ messages, partDeltas, permissions, questions, sessionStatus, hasSession, post }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  // Empty state with Kimi style
  if (messages.length === 0) {
    return (
      <div className="message-list">
        <div className="empty-state">
          {/* Logo */}
          <div className="empty-logo">OPENCODE</div>

          {/* Commands Section */}
          <div className="command-list">
            <div className="section-title">
              <span className="section-icon">⚡</span>
              Commands
            </div>
            <div className="command-item">
              <span className="command-key">/init</span>
              <span className="command-desc">Scan project and generate AGENTS.md</span>
            </div>
            <div className="command-item">
              <span className="command-key">/compact</span>
              <span className="command-desc">Trim context to essentials</span>
            </div>
          </div>

          {/* Tips Section */}
          <div className="tips-list">
            <div className="section-title">
              <span className="section-icon">💡</span>
              Tips
            </div>
            <div className="tip-item">
              <span className="tip-key">↑</span>
              <span>Browse input history</span>
            </div>
            <div className="tip-item">
              <span className="tip-key">@</span>
              <span>Add/Search files to reference</span>
            </div>
            <div className="tip-item">
              <span className="tip-key">⌘K</span>
              <span>Add selected code from editor</span>
            </div>
          </div>

          {/* Pro Tips Section */}
          <div className="pro-tips">
            <div className="section-title">
              <span className="section-icon">🚀</span>
              Pro Tips
            </div>
            <div className="pro-tip-item">
              <span className="pro-tip-bullet">•</span>
              <span>Use YOLO mode to auto-approve tool calls</span>
            </div>
            <div className="pro-tip-item">
              <span className="pro-tip-bullet">•</span>
              <span>AGENTS.md helps me understand your codebase</span>
            </div>
            <div className="pro-tip-item">
              <span className="pro-tip-bullet">•</span>
              <span>Enable Thinking for complex tasks</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="message-list">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} partDeltas={partDeltas} post={post} />
      ))}

      {permissions.map((req) => (
        <PermissionDialog key={req.requestID} request={req} post={post} />
      ))}

      {questions.map((req) => (
        <QuestionDialog key={req.requestID} request={req} post={post} />
      ))}

      {sessionStatus === "busy" && permissions.length === 0 && questions.length === 0 && (
        <div className="typing-indicator">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
