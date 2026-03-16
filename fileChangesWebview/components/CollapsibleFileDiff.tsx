import React from "react"
import { MultiFileDiff } from "@pierre/diffs/react"
import type { FileContents } from "@pierre/diffs/react"
import type { FileDiff } from "../types"

type Props = {
  diff: FileDiff
  isExpanded: boolean
  onToggle: () => void
  onFileOpen: () => void
  onShowDiff: () => void
}

export function CollapsibleFileDiff({
  diff,
  isExpanded,
  onToggle,
  onFileOpen,
  onShowDiff,
}: Props) {
  const fileName = diff.file.split("/").pop() || diff.file

  const oldFile: FileContents = {
    name: diff.file,
    contents: diff.before,
    cacheKey: `${diff.file}-before`,
  }

  const newFile: FileContents = {
    name: diff.file,
    contents: diff.after,
    cacheKey: `${diff.file}-after`,
  }

  return (
    <div className={`collapsible-file-diff ${isExpanded ? "expanded" : ""}`}>
      <div className="file-diff-header" onClick={onToggle}>
        <span className="file-diff-toggle">{isExpanded ? "▼" : "▶"}</span>
        <span className="file-diff-name" title={diff.file}>
          {fileName}
        </span>
        <span className="file-diff-path" title={diff.file}>
          {diff.file}
        </span>
        <div className="file-diff-stats">
          {diff.additions > 0 && (
            <span className="file-diff-add">+{diff.additions}</span>
          )}
          {diff.deletions > 0 && (
            <span className="file-diff-del">-{diff.deletions}</span>
          )}
        </div>
        <div className="file-diff-actions">
          <button
            className="file-diff-btn"
            onClick={(e) => {
              e.stopPropagation()
              onFileOpen()
            }}
            title="Open file"
          >
            📄
          </button>
          <button
            className="file-diff-btn"
            onClick={(e) => {
              e.stopPropagation()
              onShowDiff()
            }}
            title="Show diff in VS Code:"
          >
            🔍
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="file-diff-content">
          <MultiFileDiff
            oldFile={oldFile}
            newFile={newFile}
            options={{
              diffStyle: "unified",
              theme: "pierre-dark",
            }}
            className="pierre-diff"
          />
        </div>
      )}
    </div>
  )
}
