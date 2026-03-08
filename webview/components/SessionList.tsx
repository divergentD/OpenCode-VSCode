import React from "react"
import type { SessionInfo, SessionStatus } from "../types"

type Props = {
  sessions: SessionInfo[]
  activeSessionID: string | null
  sessionStatuses: Record<string, SessionStatus>
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onNew: () => void
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${d}d ago`
}

function sessionTitle(s: SessionInfo): string {
  const t = s.title ?? ""
  if (!t || /^(New session|Child session)/.test(t)) return "New session"
  return t
}

export function SessionList({ sessions, activeSessionID, sessionStatuses, onSelect, onDelete, onNew }: Props) {
  const sorted = [...sessions].sort((a, b) => (b.time?.updated ?? 0) - (a.time?.updated ?? 0))

  return (
    <div className="session-list">
      <div className="session-list-header">
        <span>Sessions</span>
        <button
          className="btn-icon"
          style={{ padding: "1px 4px", fontSize: "13px" }}
          onClick={onNew}
          title="New session"
        >
          +
        </button>
      </div>
      {sorted.map((s) => {
        const status = sessionStatuses[s.id]
        return (
          <div
            key={s.id}
            className={`session-item${s.id === activeSessionID ? " active" : ""}`}
            onClick={() => onSelect(s.id)}
            title={sessionTitle(s)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {status === "busy" && (
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "var(--vscode-progressBar-background, #0e70c0)",
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
              )}
              <span className="session-item-title">{sessionTitle(s)}</span>
            </div>
            <span className="session-item-time">{relativeTime(s.time?.updated ?? s.time?.created ?? Date.now())}</span>
          </div>
        )
      })}
      {sorted.length === 0 && (
        <div
          style={{
            padding: "12px 10px",
            fontSize: "11px",
            color: "var(--vscode-descriptionForeground)",
            textAlign: "center",
          }}
        >
          No sessions yet
        </div>
      )}
    </div>
  )
}
