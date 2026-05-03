import React, { useMemo, useState } from "react"
import type { FileDiff, FileDiffCallbacks } from "./types"
import { generateDiffHunks } from "./generateDiffHunks"
import { FileDiffViewer } from "./FileDiffViewer"

export function calculateFirstChangeLine(before: string, after: string): number {
  const beforeLines = before.split("\n")
  const afterLines = after.split("\n")

  const minLength = Math.min(beforeLines.length, afterLines.length)
  for (let i = 0; i < minLength; i++) {
    if (beforeLines[i] !== afterLines[i]) {
      return i
    }
  }

  if (beforeLines.length !== afterLines.length) {
    return minLength
  }

  return 0
}

interface FileDiffItemProps {
  diff: FileDiff
  callbacks?: FileDiffCallbacks
  isExpanded?: boolean
  onToggle?: () => void
}

export const FileDiffItem: React.FC<FileDiffItemProps> = ({
  diff,
  callbacks,
  isExpanded: isExpandedProp,
  onToggle,
}) => {
  const [isExpandedInternal, setIsExpandedInternal] = useState(true)
  const isControlled = isExpandedProp !== undefined
  const isExpanded = isControlled ? isExpandedProp : isExpandedInternal
  const setIsExpanded = isControlled
    ? onToggle ?? (() => {})
    : setIsExpandedInternal

  const diffHunks = useMemo(
    () => generateDiffHunks(diff.file, diff.before, diff.after),
    [diff],
  )

  const fileName = diff.file.split("/").pop() || diff.file

  const handleOpenFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    const line = calculateFirstChangeLine(diff.before, diff.after)
    callbacks?.onFileOpen?.(diff.file, line)
  }

  const handleShowDiff = (e: React.MouseEvent) => {
    e.stopPropagation()
    callbacks?.onShowDiff?.(diff.file, diff.before, diff.after)
  }

  return (
    <div className="opencode-file-diff-item">
      <div
        className="opencode-file-diff-item__header"
        onClick={() => {
          if (isControlled) {
            onToggle?.()
          } else {
            setIsExpandedInternal((prev) => !prev)
          }
        }}
      >
        <span className="opencode-file-diff-item__toggle">
          {isExpanded ? "▼" : "▶"}
        </span>
        <span className="opencode-file-diff-item__name" title={diff.file}>
          {fileName}
        </span>
        <span className="opencode-file-diff-item__path" title={diff.file}>
          {diff.file}
        </span>
        <span className="opencode-file-diff-item__stats">
          {diff.additions > 0 && (
            <span className="opencode-file-diff-item__add">
              +{diff.additions}
            </span>
          )}
          {diff.deletions > 0 && (
            <span className="opencode-file-diff-item__del">
              -{diff.deletions}
            </span>
          )}
        </span>
        <div className="opencode-file-diff-item__actions">
          <button
            className="opencode-file-diff-item__btn"
            onClick={handleOpenFile}
            title="Open file"
          >
            📄
          </button>
          <button
            className="opencode-file-diff-item__btn"
            onClick={handleShowDiff}
            title="Show diff in VS Code:"
          >
            🔍
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="opencode-file-diff-item__content">
          <FileDiffViewer diff={diffHunks} />
        </div>
      )}
    </div>
  )
}
