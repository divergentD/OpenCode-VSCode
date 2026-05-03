import React, { useState, useRef, useEffect } from "react"
import "./SessionDrawer.css"
import { TrashIcon, CheckIcon } from "../../packages/ui/src/primitives/Icon"
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

// Search icon component
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
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
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter sessions based on search query
  const filteredSessions = sessions.filter((session) =>
    session.title?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Sort by updated time (most recent first)
  const sorted = [...filteredSessions].sort(
    (a, b) => (b.time?.updated || 0) - (a.time?.updated || 0)
  )

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

  const handleDelete = (sessionId: string) => {
    if (deleteConfirmId === sessionId) {
      onDelete(sessionId)
      setDeleteConfirmId(null)
    } else {
      setDeleteConfirmId(sessionId)
    }
  }

  return (
    <div className="session-dropdown-overlay" onClick={onClose}>
      <div
        ref={dropdownRef}
        className="session-dropdown"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Box */}
        <div className="session-dropdown-search">
          <SearchIcon className="search-icon" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="session-search-input"
          />
        </div>

        {/* Session List */}
        <div className="session-dropdown-list">
          {sorted.map((session) => {
            const isActive = session.id === activeSessionID
            const isConfirmingDelete = deleteConfirmId === session.id

            return (
              <div
                key={session.id}
                className={`session-dropdown-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  if (!isConfirmingDelete) {
                    onSelect(session.id)
                  }
                }}
              >
                <div className="session-item-content">
                  <div className="session-item-title-row">
                    <span className="session-item-title">
                      {session.title || "New Chat"}
                    </span>
                    {isActive && <CheckIcon size={16} className="session-item-check" />}
                  </div>
                  <div className="session-item-meta">
                    <span className="session-item-time">
                      {formatTime(session.time?.updated || session.time?.created || Date.now())}
                    </span>
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  className={`session-delete-btn ${isConfirmingDelete ? "confirming" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(session.id)
                  }}
                  title={isConfirmingDelete ? "Click again to confirm" : "Delete"}
                >
                  <TrashIcon size={16} className="delete-icon" />
                  <span className="delete-text">
                    {isConfirmingDelete ? "Confirm" : "Delete"}
                  </span>
                </button>
              </div>
            )
          })}

          {sorted.length === 0 && (
            <div className="session-dropdown-empty">
              {searchQuery ? "No matching conversations" : "No chats yet"}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
