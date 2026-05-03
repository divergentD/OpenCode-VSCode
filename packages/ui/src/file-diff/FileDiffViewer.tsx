import React from "react"
import { Diff } from "react-diff-view"
import type { DiffHunks } from "./generateDiffHunks"
import "./FileDiff.css"

interface FileDiffViewerProps {
  diff: DiffHunks
}

export const FileDiffViewer: React.FC<FileDiffViewerProps> = ({ diff }) => {
  if (!diff.hunks || diff.hunks.length === 0) {
    return <div className="opencode-file-diff-viewer">No changes</div>
  }

  return (
    <div className="opencode-file-diff-viewer">
      <Diff
        viewType="unified"
        diffType={diff.type}
        hunks={diff.hunks}
        widgets={{}}
      />
    </div>
  )
}
