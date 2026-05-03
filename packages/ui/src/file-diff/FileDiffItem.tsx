import React, { useState } from "react"
import type { FileDiff, FileDiffCallbacks } from "./types"
import { extractBeforeAfterFromPatch } from "./generateDiffHunks"
import { FileDiffViewer } from "./FileDiffViewer"
import { ChevronDownIcon } from "../primitives/Icon/icons/ChevronDownIcon"
import { ChevronRightIcon } from "../primitives/Icon/icons/ChevronRightIcon"
import { OpenFileIcon } from "../primitives/Icon/icons/OpenFileIcon"
import { ShowDiffIcon } from "../primitives/Icon/icons/ShowDiffIcon"
import { SplitViewIcon } from "../primitives/Icon/icons/SplitViewIcon"
import { UnifiedViewIcon } from "../primitives/Icon/icons/UnifiedViewIcon"

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
  const [viewType, setViewType] = useState<"unified" | "split">("unified")
  const isControlled = isExpandedProp !== undefined
  const isExpanded = isControlled ? isExpandedProp : isExpandedInternal
  const setIsExpanded = isControlled
    ? onToggle ?? (() => {})
    : setIsExpandedInternal

  const getBeforeAfter = (): { before: string; after: string } => {
    if (diff.before !== undefined && diff.after !== undefined) {
      return { before: diff.before, after: diff.after }
    }
    if (diff.patch) {
      return extractBeforeAfterFromPatch(diff.patch)
    }
    return { before: "", after: "" }
  }

  const { before, after } = getBeforeAfter()

  const fileName = diff.file.split("/").pop() || diff.file

  const handleOpenFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (before && after) {
      const line = calculateFirstChangeLine(before, after)
      callbacks?.onFileOpen?.(diff.file, line)
    } else {
      callbacks?.onFileOpen?.(diff.file)
    }
  }

  const handleShowDiff = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (before && after) {
      callbacks?.onShowDiff?.(diff.file, before, after, diff.patch)
    }
  }

  const toggleViewType = (e: React.MouseEvent) => {
    e.stopPropagation()
    setViewType((prev) => (prev === "unified" ? "split" : "unified"))
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
          {isExpanded ? (
            <ChevronDownIcon size={12} />
          ) : (
            <ChevronRightIcon size={12} />
          )}
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
            <OpenFileIcon size={14} />
          </button>
          <button
            className="opencode-file-diff-item__btn"
            onClick={handleShowDiff}
            title="Show diff in VS Code:"
          >
            <ShowDiffIcon size={14} />
          </button>
          <button
            className="opencode-file-diff-item__btn"
            onClick={toggleViewType}
            title={
              viewType === "unified"
                ? "Switch to split view"
                : "Switch to unified view"
            }
          >
            {viewType === "unified" ? (
              <SplitViewIcon size={14} />
            ) : (
              <UnifiedViewIcon size={14} />
            )}
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="opencode-file-diff-item__content">
          <FileDiffViewer
            before={before}
            after={after}
            filePath={diff.file}
            viewType={viewType}
          />
        </div>
      )}
    </div>
  )
}
