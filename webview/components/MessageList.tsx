import React, { useRef, useEffect, useState, useCallback } from "react"
import type { MessageInfo, PermissionRequest, QuestionRequest, SessionStatus, FileDiff } from "../types"
import type { WebviewMessage } from "../types"
import { MessageBubble } from "./MessageBubble"
import { PermissionDialog } from "./PermissionDialog"
import { QuestionDialog } from "./QuestionDialog"
import { ScrollToBottomButton } from "./ScrollToBottomButton"
import "./MessageList.css"

type Props = {
  messages: MessageInfo[]
  partDeltas: Record<string, string>
  permissions: PermissionRequest[]
  questions: QuestionRequest[]
  sessionStatus: SessionStatus
  hasSession: boolean
  fileChanges: FileDiff[]
  post: (msg: WebviewMessage) => void
}

// Number of messages to show initially (2 rounds = 4 messages)
const INITIAL_VISIBLE_COUNT = 4
// Number of messages to load per scroll (2 rounds = 4 messages)
const LOAD_BATCH_SIZE = 4
// Distance from top to trigger loading more messages (px)
const SCROLL_THRESHOLD = 100

export function MessageList({ messages, partDeltas, permissions, questions, sessionStatus, hasSession, fileChanges, post }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const lastMessageLengthRef = useRef(messages.length)

  // Reset visible count when messages array changes (new conversation)
  useEffect(() => {
    if (messages.length !== lastMessageLengthRef.current) {
      // If messages increased, user sent new message - scroll to bottom
      // If messages decreased significantly, likely new session
      const isNewSession = messages.length < lastMessageLengthRef.current - 1
      if (isNewSession) {
        setVisibleCount(INITIAL_VISIBLE_COUNT)
      }
      lastMessageLengthRef.current = messages.length
    }
  }, [messages.length])

  // Auto-scroll to bottom when new messages arrive (only if already near bottom)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages.length])

  // Handle scroll - load more messages when scrolling to top
  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    // Check if we should show scroll-to-bottom button
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    setShowScrollButton(distanceFromBottom > 100)

    // Check if we should load more messages (scrolled to top)
    if (container.scrollTop < SCROLL_THRESHOLD && visibleCount < messages.length) {
      setVisibleCount((prev) => Math.min(prev + LOAD_BATCH_SIZE, messages.length))
    }
  }, [visibleCount, messages.length])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  // Calculate visible messages (slice from the end)
  const visibleMessages = messages.length <= visibleCount
    ? messages
    : messages.slice(messages.length - visibleCount)

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
    <div className="message-list" ref={containerRef}>
      {visibleMessages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} partDeltas={partDeltas} fileChanges={fileChanges} post={post} />
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
      <ScrollToBottomButton containerRef={containerRef} visible={showScrollButton} />
    </div>
  )
}
