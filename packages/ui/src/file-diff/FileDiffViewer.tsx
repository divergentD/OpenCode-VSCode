import React, { useMemo } from "react"
import { Diff, parseDiff } from "react-diff-view"
import "./FileDiff.css"

interface FileDiffViewerProps {
  diffText: string
}

export const FileDiffViewer: React.FC<FileDiffViewerProps> = ({ diffText }) => {
  const files = useMemo(() => parseDiff(diffText), [diffText])
  const file = files[0]

  if (!file) {
    return null
  }

  return (
    <div className="opencode-file-diff-viewer">
      <Diff
        viewType="unified"
        diffType={file.type}
        hunks={file.hunks}
        widgets={{}}
      />
    </div>
  )
}
