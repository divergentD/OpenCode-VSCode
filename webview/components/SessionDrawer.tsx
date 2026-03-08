import React from "react"
import type { SessionInfo, SessionStatus } from "../types"

type Props = {
  sessions: SessionInfo[]
  activeSessionID: string | null
  sessionStatuses: Record<string, SessionStatus>
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onNew: () => void
  onClose: () => void
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (hours < 1) return "Just now"
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

export function SessionDrawer({
  sessions,
  activeSessionID,
  sessionStatuses,
  onSelect,
  onDelete,
  onNew,
  onClose,
}: Props) {
  const sorted = [...sessions].sort((a, b) => (b.time?.updated || 0) - (a.time?.updated || 0))

  return (
    <>
      <div
        className="session-drawer-overlay"
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          zIndex: 99,
        }}
      />
      <div className="session-drawer">
        <div className="session-drawer-header">
          <span className="session-drawer-title">Recent Chats</span>
          <button className="btn-icon-modern" onClick={onNew} title="New Chat">
            +
          </button>
        </div>

        <div className="session-list-modern">
          {sorted.map((session) => {
            const isActive = session.id === activeSessionID
            const status = sessionStatuses[session.id]

            return (
              <div
                key={session.id}
                className={`session-item-modern ${isActive ? "active" : ""}`}
                onClick={() => onSelect(session.id)}
              >
                <div className="session-item-icon">{status === "busy" ? "⚡" : "💬"}</div>
                <div className="session-item-info">
                  <div className="session-item-title">{session.title || "New Chat"}</div>
                  <div className="session-item-time">
                    {formatTime(session.time?.updated || session.time?.created || Date.now())}
                  </div>
                </div>

                <button
                  className="btn-icon-modern"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(session.id)
                  }}
                  title="Delete"
                >
                  ×
                </button>
              </div>
            )
          })}

          {sorted.length === 0 && (
            <div style={{ padding: "20px", textAlign: "center", color: "#6b7280" }}>No chats yet</div>
          )}
        </div>
      </div>
    </>
  )
}
