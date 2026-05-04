import React, { useState, useRef, useEffect } from "react"
import "./SessionDrawer.css"
import { TrashIcon, CheckIcon, ChevronRightIcon, ChevronDownIcon } from "../../packages/ui/src/primitives/Icon"
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

function buildSessionTree(sessions: SessionInfo[]): Array<{ session: SessionInfo; depth: number; children: string[] }> {
  const sessionMap = new Map(sessions.map((s) => [s.id, s]))
  const childrenMap = new Map<string, string[]>()

  sessions.forEach((session) => {
    if (session.parentID) {
      const siblings = childrenMap.get(session.parentID) || []
      siblings.push(session.id)
      childrenMap.set(session.parentID, siblings)
    }
  })

  const tree: Array<{ session: SessionInfo; depth: number; children: string[] }> = []
  const visited = new Set<string>()

  const addSession = (sessionID: string, depth: number) => {
    if (visited.has(sessionID)) return
    visited.add(sessionID)

    const session = sessionMap.get(sessionID)
    if (!session) return

    const children = childrenMap.get(sessionID) || []
    tree.push({ session, depth, children })

    children.forEach((childId) => addSession(childId, depth + 1))
  }

  const roots = sessions
    .filter((s) => !s.parentID)
    .sort((a, b) => (b.time?.updated || 0) - (a.time?.updated || 0))
  roots.forEach((root) => addSession(root.id, 0))

  sessions.forEach((session) => {
    if (!visited.has(session.id)) {
      addSession(session.id, 0)
    }
  })

  return tree
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
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filteredSessions = sessions.filter((session) =>
    session.title?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sessionTree = buildSessionTree(filteredSessions)

  const toggleExpand = (sessionID: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedParents((prev) => {
      const next = new Set(prev)
      if (next.has(sessionID)) {
        next.delete(sessionID)
      } else {
        next.add(sessionID)
      }
      return next
    })
  }

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
          {sessionTree.map(({ session, depth, children }) => {
            const isActive = session.id === activeSessionID
            const isConfirmingDelete = deleteConfirmId === session.id
            const hasChildren = children.length > 0
            const isExpanded = expandedParents.has(session.id)

            return (
              <div
                key={session.id}
                className={`session-dropdown-item depth-${Math.min(depth, 3)} ${isActive ? "active" : ""}`}
                style={{ paddingLeft: `${12 + depth * 16}px` }}
                onClick={() => {
                  if (!isConfirmingDelete) {
                    onSelect(session.id)
                  }
                }}
              >
                {hasChildren && (
                  <button
                    className="session-expand-toggle"
                    onClick={(e) => toggleExpand(session.id, e)}
                  >
                    {isExpanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
                  </button>
                )}
                {!hasChildren && <span className="session-expand-placeholder" />}

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
                    {session.parentID && (
                      <span className="session-item-badge">child</span>
                    )}
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

          {sessionTree.length === 0 && (
            <div className="session-dropdown-empty">
              {searchQuery ? "No matching conversations" : "No chats yet"}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
