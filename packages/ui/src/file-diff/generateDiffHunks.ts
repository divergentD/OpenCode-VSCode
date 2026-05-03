import { structuredPatch } from "diff"

export interface DiffHunks {
  type: "add" | "delete" | "modify"
  hunks: Array<{
    oldStart: number
    oldLines: number
    newStart: number
    newLines: number
    changes: Array<{
      type: "insert" | "delete" | "normal"
      content: string
      oldLineNumber?: number
      newLineNumber?: number
      isInsert: boolean
      isDelete: boolean
      isNormal: boolean
    }>
  }>
}

export function generateDiffHunks(
  filePath: string,
  before: string,
  after: string,
): DiffHunks {
  const type = before === "" ? "add" : after === "" ? "delete" : "modify"

  const patch = structuredPatch(
    filePath,
    filePath,
    before || "",
    after || "",
    "",
    "",
    {
      context: 3,
    },
  )

  return {
    type,
    hunks: patch.hunks.map((hunk) => {
      let oldLineNumber = hunk.oldStart
      let newLineNumber = hunk.newStart

      return {
        oldStart: hunk.oldStart,
        oldLines: hunk.oldLines,
        newStart: hunk.newStart,
        newLines: hunk.newLines,
        changes: hunk.lines.map((line) => {
          const type =
            line[0] === "+" ? "insert" : line[0] === "-" ? "delete" : "normal"

          return {
            type,
            content: line.slice(1),
            oldLineNumber: type === "insert" ? undefined : oldLineNumber++,
            newLineNumber: type === "delete" ? undefined : newLineNumber++,
            isInsert: type === "insert",
            isDelete: type === "delete",
            isNormal: type === "normal",
          }
        }),
      }
    }),
  }
}
