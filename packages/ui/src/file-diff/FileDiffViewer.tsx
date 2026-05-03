import React, { useMemo } from "react"
import { Diff, tokenize } from "react-diff-view"
import type { DiffHunks } from "./generateDiffHunks"
import { detectLanguage, refractor } from "./syntaxHighlight"
import "./FileDiff.css"

interface FileDiffViewerProps {
  diff: DiffHunks
  filePath?: string
  oldSource?: string
}

export const FileDiffViewer: React.FC<FileDiffViewerProps> = ({
  diff,
  filePath,
  oldSource,
}) => {
  const tokens = useMemo(() => {
    if (!diff.hunks || diff.hunks.length === 0) {
      return null
    }

    const language = filePath ? detectLanguage(filePath) : null
    if (!language || !refractor.registered(language)) {
      return null
    }

    try {
      const options: {
        highlight: true
        language: string
        refractor: typeof refractor
        oldSource?: string
      } = {
        highlight: true,
        language,
        refractor,
      }

      if (oldSource) {
        options.oldSource = oldSource
      }

      return tokenize(diff.hunks, options)
    } catch {
      return null
    }
  }, [diff.hunks, filePath, oldSource])

  if (!diff.hunks || diff.hunks.length === 0) {
    return <div className="opencode-file-diff-viewer">No changes</div>
  }

  return (
    <div className="opencode-file-diff-viewer">
      <Diff
        viewType="unified"
        diffType={diff.type}
        hunks={diff.hunks}
        tokens={tokens}
        widgets={{}}
      />
    </div>
  )
}
