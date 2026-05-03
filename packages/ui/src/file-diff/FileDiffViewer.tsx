import React, { useMemo } from "react"
import { FileDiff } from "@pierre/diffs/react"
import type { FileDiffOptions } from "@pierre/diffs/react"
import { parseDiffFromFile } from "@pierre/diffs"
import type { FileContents } from "@pierre/diffs"
import { useVSCodeTheme } from "../theme/VSCodeThemeProvider"
import "./FileDiff.css"

interface FileDiffViewerProps {
  before?: string
  after?: string
  filePath?: string
  viewType?: "unified" | "split"
}

export const FileDiffViewer: React.FC<FileDiffViewerProps> = ({
  before,
  after,
  filePath,
  viewType = "unified",
}) => {
  const { theme } = useVSCodeTheme()

  const fileDiff = useMemo(() => {
    if (before === undefined || after === undefined) {
      return null
    }

    const oldFile: FileContents = {
      name: filePath || "file",
      contents: before,
    }

    const newFile: FileContents = {
      name: filePath || "file",
      contents: after,
    }

    try {
      return parseDiffFromFile(oldFile, newFile)
    } catch {
      return null
    }
  }, [before, after, filePath])

  const themeType = theme === "light" || theme === "highContrastLight" ? "light" : "dark"

  const options: FileDiffOptions = useMemo(
    () => ({
      diffStyle: viewType,
      collapsedContextThreshold: 10,
      expandUnchanged: false,
      themeType,
      overflow: "scroll",
    }),
    [viewType, themeType]
  )

  if (!fileDiff) {
    return (
      <div className="opencode-file-diff-viewer">No changes</div>
    )
  }

  return (
    <div className="opencode-file-diff-viewer">
      <FileDiff
        fileDiff={fileDiff}
        options={options}
        disableWorkerPool={true}
      />
    </div>
  )
}
