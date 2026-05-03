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
