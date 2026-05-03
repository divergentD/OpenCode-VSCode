import { parseDiff } from "react-diff-view"
import type { Change, Hunk } from "gitdiff-parser"
import { structuredPatch } from "diff"

export interface DiffHunks {
  type: "add" | "delete" | "modify"
  hunks: Hunk[]
}

function parseSimplePatch(patch: string): DiffHunks {
  const lines = patch.split("\n")
  const hunks: Hunk[] = []
  let currentHunk: Hunk | null = null
  let oldLineNumber = 0
  let newLineNumber = 0

  for (const line of lines) {
    const hunkMatch = line.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/)
    if (hunkMatch) {
      if (currentHunk) {
        hunks.push(currentHunk)
      }
      oldLineNumber = parseInt(hunkMatch[1], 10)
      newLineNumber = parseInt(hunkMatch[3], 10)
      currentHunk = {
        content: line,
        oldStart: oldLineNumber,
        oldLines: parseInt(hunkMatch[2], 10) || 1,
        newStart: newLineNumber,
        newLines: parseInt(hunkMatch[4], 10) || 1,
        changes: [],
      }
      continue
    }

    if (!currentHunk) continue

    if (line.startsWith("+")) {
      currentHunk.changes.push({
        type: "insert" as const,
        content: line.slice(1),
        lineNumber: newLineNumber++,
        isInsert: true as const,
      })
    } else if (line.startsWith("-")) {
      currentHunk.changes.push({
        type: "delete" as const,
        content: line.slice(1),
        lineNumber: oldLineNumber++,
        isDelete: true as const,
      })
    } else if (line.startsWith(" ")) {
      currentHunk.changes.push({
        type: "normal" as const,
        content: line.slice(1),
        oldLineNumber: oldLineNumber++,
        newLineNumber: newLineNumber++,
        isNormal: true as const,
      })
    } else if (line === "\\ No newline at end of file") {
      continue
    } else if (line.trim() === "") {
      currentHunk.changes.push({
        type: "normal" as const,
        content: "",
        oldLineNumber: oldLineNumber++,
        newLineNumber: newLineNumber++,
        isNormal: true as const,
      })
    }
  }

  if (currentHunk) {
    hunks.push(currentHunk)
  }

  return { type: "modify", hunks }
}

export function extractBeforeAfterFromPatch(patch: string): { before: string; after: string } {
  if (!patch || typeof patch !== "string") {
    return { before: "", after: "" }
  }

  const beforeLines: string[] = []
  const afterLines: string[] = []
  const lines = patch.split("\n")
  let inHunk = false

  for (const line of lines) {
    if (line.startsWith("diff --git") || line.startsWith("index ") || line.startsWith("--- ") || line.startsWith("+++ ")) {
      continue
    }

    if (line.match(/^@@ -\d+,?\d* \+\d+,?\d* @@/)) {
      inHunk = true
      continue
    }

    if (!inHunk) continue

    if (line === "\\ No newline at end of file") {
      continue
    }

    if (line.startsWith("+")) {
      afterLines.push(line.slice(1))
    } else if (line.startsWith("-")) {
      beforeLines.push(line.slice(1))
    } else if (line.startsWith(" ")) {
      const content = line.slice(1)
      beforeLines.push(content)
      afterLines.push(content)
    } else if (line.trim() === "") {
      beforeLines.push("")
      afterLines.push("")
    }
  }

  return {
    before: beforeLines.join("\n"),
    after: afterLines.join("\n"),
  }
}

export function generateDiffHunksFromPatch(patch: string): DiffHunks {
  if (!patch || typeof patch !== "string") {
    console.warn("[generateDiffHunksFromPatch] Invalid patch:", patch)
    return { type: "modify", hunks: [] }
  }

  // Try gitdiff-parser first (for standard git diff format)
  try {
    const files = parseDiff(patch)
    if (files && files.length > 0) {
      const file = files[0]
      if (file.hunks) {
        return {
          type: (file.type as "add" | "delete" | "modify") || "modify",
          hunks: file.hunks.map((hunk) => {
            let oldLineNumber = hunk.oldStart
            let newLineNumber = hunk.newStart

            return {
              content:
                hunk.content ||
                `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
              oldStart: hunk.oldStart,
              oldLines: hunk.oldLines,
              newStart: hunk.newStart,
              newLines: hunk.newLines,
              changes: (hunk.changes || []).map((change) => {
                if (change.type === "insert") {
                  return {
                    type: "insert" as const,
                    content: change.content,
                    lineNumber: change.lineNumber,
                    isInsert: true as const,
                  }
                }

                if (change.type === "delete") {
                  return {
                    type: "delete" as const,
                    content: change.content,
                    lineNumber: change.lineNumber,
                    isDelete: true as const,
                  }
                }

                return {
                  type: "normal" as const,
                  content: change.content,
                  oldLineNumber: change.oldLineNumber,
                  newLineNumber: change.newLineNumber,
                  isNormal: true as const,
                }
              }) as Change[],
            }
          }),
        }
      }
    }
  } catch (err) {
    console.log("[generateDiffHunksFromPatch] parseDiff failed, trying simple parser")
  }

  // Fallback to simple parser (for raw unified diff without git headers)
  try {
    return parseSimplePatch(patch)
  } catch (err) {
    console.error("[generateDiffHunksFromPatch] Simple parser also failed:", err)
    console.error("[generateDiffHunksFromPatch] Patch preview:", patch.substring(0, 200))
    return { type: "modify", hunks: [] }
  }
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
        content:
          hunk.header ||
          `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
        oldStart: hunk.oldStart,
        oldLines: hunk.oldLines,
        newStart: hunk.newStart,
        newLines: hunk.newLines,
        changes: hunk.lines.map((line) => {
          const lineType =
            line[0] === "+" ? "insert" : line[0] === "-" ? "delete" : "normal"

          if (lineType === "insert") {
            return {
              type: "insert" as const,
              content: line.slice(1),
              lineNumber: newLineNumber++,
              isInsert: true as const,
            }
          }

          if (lineType === "delete") {
            return {
              type: "delete" as const,
              content: line.slice(1),
              lineNumber: oldLineNumber++,
              isDelete: true as const,
            }
          }

          return {
            type: "normal" as const,
            content: line.slice(1),
            oldLineNumber: oldLineNumber++,
            newLineNumber: newLineNumber++,
            isNormal: true as const,
          }
        }) as Change[],
      }
    }),
  }
}
