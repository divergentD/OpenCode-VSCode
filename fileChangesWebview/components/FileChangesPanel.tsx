import React from "react"
import type { FileDiff } from "../types"
import { CollapsibleFileDiff } from "./CollapsibleFileDiff"

type Props = {
  sessionID: string | null
  diffs: FileDiff[]
  expandedFiles: Set<string>
  onFileToggle: (file: string) => void
  onFileOpen: (path: string, line?: number) => void
  onShowDiff: (path: string, before: string, after: string, patch?: string) => void
  onToggleAll: () => void
}

export function FileChangesPanel({
  sessionID,
  diffs,
  expandedFiles,
  onFileToggle,
  onFileOpen,
  onShowDiff,
  onToggleAll,
}: Props) {
  const totalAdditions = diffs.reduce((sum, d) => sum + d.additions, 0)
  const totalDeletions = diffs.reduce((sum, d) => sum + d.deletions, 0)

  if (!sessionID || diffs.length === 0) {
    return (
      <div className="file-changes-panel empty">
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <p className="empty-text">No file changes</p>
          <p className="empty-subtext">Select a session to view file changes</p>
        </div>
      </div>
    )
  }

  return (
    <div className="file-changes-panel">
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-icon">📄</span>
          <span>File Changes</span>
        </div>
        <div className="panel-stats">
          <span className="file-count">{diffs.length} files</span>
          {totalAdditions > 0 && (
            <span className="stat-additions">+{totalAdditions}</span>
          )}
          {totalDeletions > 0 && (
            <span className="stat-deletions">-{totalDeletions}</span>
          )}
        </div>
        <div className="panel-actions">
          <button
            className={`panel-btn toggle-btn ${expandedFiles.size === diffs.length ? "expanded" : ""}`}
            onClick={onToggleAll}
            title={expandedFiles.size === diffs.length ? "Collapse all files" : "Expand all files"}
          >
            <span className="toggle-icon">▼</span>
          </button>
        </div>
      </div>
      <div className="panel-content">
        {diffs.map((diff) => (
          <CollapsibleFileDiff
            key={diff.file}
            diff={diff}
            isExpanded={expandedFiles.has(diff.file)}
            onToggle={() => onFileToggle(diff.file)}
            onFileOpen={() => onFileOpen(diff.file, 0)}
            onShowDiff={(path, before, after, patch) => onShowDiff(path, before, after, patch)}
          />
        ))}
      </div>
    </div>
  )
}
