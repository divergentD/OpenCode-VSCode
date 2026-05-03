import { createPatch } from "diff"

export function generateUnifiedDiff(
  filePath: string,
  before: string,
  after: string,
): string {
  return createPatch(filePath, before, after, undefined, undefined, {
    context: 3,
  })
}
