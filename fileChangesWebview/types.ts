export type FileDiff = {
  file: string
  before?: string
  after?: string
  patch?: string
  additions: number
  deletions: number
}

export type ThemeKind = "light" | "dark" | "highContrast" | "highContrastLight"

export type HostMessage =
  | { type: "init"; sessionID: string; diffs: FileDiff[] }
  | { type: "update"; sessionID: string; diffs: FileDiff[] }
  | { type: "theme.changed"; theme: { kind: ThemeKind } }

export type WebviewMessage =
  | { type: "file.open"; path: string; line?: number }
  | { type: "file.diff"; path: string; before?: string; after?: string; patch?: string }
