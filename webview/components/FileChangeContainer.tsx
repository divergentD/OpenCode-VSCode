import React, { useState } from "react"
import type { FileDiff } from "../types"
import type { WebviewMessage } from "../types"

type Props = {
  diffs: FileDiff[]
  post: (msg: WebviewMessage) => void
}

export function FileChangeContainer({ diffs, post }: Props) {
  const [isExpanded, setIsExpanded] = useState(true)

  if (!diffs || diffs.length === 0) {
    return null
  }

  const totalAdditions = diffs.reduce((sum, d) => sum + d.additions, 0)
  const totalDeletions = diffs.reduce((sum, d) => sum + d.deletions, 0)

  return (
    <div className="file-change-container">
      <div className="file-change-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="file-change-toggle">{isExpanded ? "▼" : "▶"}</span>
        <span className="file-change-title">File Changes</span>
        <span className="file-change-count">{diffs.length} files</span>
        <div className="file-change-stats">
          {totalAdditions > 0 && <span className="file-change-additions">+{totalAdditions}</span>}
          {totalDeletions > 0 && <span className="file-change-deletions">-{totalDeletions}</span>}
        </div>
      </div>
      {isExpanded && (
        <div className="file-change-list">
          {diffs.map((diff, index) => (
            <FileChangeItem key={index} diff={diff} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}

function FileChangeItem({ diff, post }: { diff: FileDiff; post: (msg: WebviewMessage) => void }) {
  const fileName = diff.file.split("/").pop() || diff.file
  const filePath = diff.file

  const handleOpenFile = () => {
    console.log('[FileChangeItem] Opening file:', filePath)
    post({ type: "file.open", path: filePath })
  }

  const handleShowDiff = () => {
    console.log('[FileChangeItem] Showing diff for:', filePath)
    post({ type: "file.diff", path: filePath, before: diff.before, after: diff.after })
  }

  return (
    <div className="file-change-item">
      <div className="file-change-item-info">
        <span className="file-change-item-name" title={filePath}>
          {fileName}
        </span>
        <span className="file-change-item-path" title={filePath}>
          {filePath}
        </span>
      </div>
      <div className="file-change-item-stats">
        {diff.additions > 0 && <span className="file-change-additions">+{diff.additions}</span>}
        {diff.deletions > 0 && <span className="file-change-deletions">-{diff.deletions}</span>}
      </div>
      <div className="file-change-item-actions">
        <button className="file-change-btn" onClick={handleOpenFile} title="Open file">
          📄
        </button>
        <button className="file-change-btn" onClick={handleShowDiff} title="Show diff">
          🔍
        </button>
      </div>
    </div>
  )
}