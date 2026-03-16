export type FileDiff = {
  file: string
  before: string
  after: string
  additions: number
  deletions: number
}

export type HostMessage =
  | { type: "init"; sessionID: string; diffs: FileDiff[] }
  | { type: "update"; sessionID: string; diffs: FileDiff[] }

export type WebviewMessage =
  | { type: "file.open"; path: string; line?: number }
  | { type: "file.diff"; path: string; before: string; after: string }
