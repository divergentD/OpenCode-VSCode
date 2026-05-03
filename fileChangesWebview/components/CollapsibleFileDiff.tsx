import React from "react"
import { FileDiffItem } from "../../packages/ui/src/file-diff"
import type { FileDiff } from "../types"

type Props = {
  diff: FileDiff
  isExpanded: boolean
  onToggle: () => void
  onFileOpen: (path: string, line?: number) => void
  onShowDiff: (path: string, before: string, after: string, patch?: string) => void
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
          ...(diff.before !== undefined && { before: diff.before }),
          ...(diff.after !== undefined && { after: diff.after }),
          ...(diff.patch !== undefined && { patch: diff.patch }),
          additions: diff.additions,
          deletions: diff.deletions,
        }}
        isExpanded={isExpanded}
        onToggle={onToggle}
        callbacks={{
          onFileOpen: (path, line) => onFileOpen(path, line),
          onShowDiff: (path, before, after, patch) => onShowDiff(path, before, after, patch),
        }}
      />
    </div>
  )
}
