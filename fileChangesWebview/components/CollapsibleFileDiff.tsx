import React from "react"
import { FileDiffItem } from "../../packages/ui/src/file-diff"
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
  return (
    <div className={`collapsible-file-diff ${isExpanded ? "expanded" : ""}`}>
      <FileDiffItem
        diff={{
          file: diff.file,
          before: diff.before,
          after: diff.after,
          additions: diff.additions,
          deletions: diff.deletions,
        }}
        isExpanded={isExpanded}
        onToggle={onToggle}
        callbacks={{
          onFileOpen: () => onFileOpen(),
          onShowDiff: () => onShowDiff(),
        }}
      />
    </div>
  )
}
