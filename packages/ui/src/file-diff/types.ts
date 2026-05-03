export interface FileDiff {
  file: string
  before: string
  after: string
  additions: number
  deletions: number
}

export interface FileDiffCallbacks {
  onFileOpen?: (path: string, line?: number) => void
  onShowDiff?: (path: string, before: string, after: string) => void
}
