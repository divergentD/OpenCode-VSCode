# Implementation Plan: Standalone File Changes View

## Context

**User Request Summary:**
Extract the file changes list from the current ChatPanel bottom position into an independent VS Code: webview panel that:
- Opens on the right side (ViewColumn.Two) as a persistent panel
- Uses @pierre/diffs DiffViewer component for inline diff display
- Shows each file as a collapsible accordion item
- All file diffs collapsed by default
- Integrates with existing state management

**Current Architecture Analysis:**
- Single webview entry point (webview/index.tsx) using IIFE format
- State management via reducer pattern with `fileChanges: Record<string, FileDiff[]>`
- Communication via postMessage with typed HostMessage/WebviewMessage
- Extension uses WebviewViewProvider for sidebar chat
- @pierre/diffs v1.1.0 already installed

---

## @pierre/diffs API Analysis

**FileDiff Component Props:**
```typescript
interface FileDiffProps<LAnnotation> extends DiffBasePropsReact<LAnnotation> {
  fileDiff: FileDiffMetadata;
}

interface FileDiffMetadata {
  name: string;                    // File path/name
  prevName?: string;               // Previous path if renamed
  lang?: SupportedLanguages;       // Language override
  type: ChangeTypes;               // "modified" | "added" | "deleted" | "renamed"
  hunks: Hunk[];                   // Diff hunks with line changes
  splitLineCount: number;          // Pre-computed for split view
  unifiedLineCount: number;        // Pre-computed for unified view
  isPartial: boolean;              // True if from patch, false if full content
  deletionLines: string[];         // Old file content lines
  additionLines: string[];         // New file content lines
}
```

**Usage Pattern:**
```typescript
import { FileDiff } from "@pierre/diffs/react"

<FileDiff 
  fileDiff={fileDiffMetadata}
  options={{
    diffStyle: "unified",  // or "split"
    theme: "github-light", // or "github-dark"
  }}
/>
```

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1: Analyze @pierre/diffs API | None | Must understand DiffViewer component props before implementation |
| Task 2: Update package.json contributions | None | New view container and commands registration required |
| Task 3: Create FileChangesPanelProvider.ts | Task 1, Task 2 | Needs diff component knowledge and package.json config |
| Task 4: Update esbuild.js | None | Build configuration must support second webview entry point |
| Task 5: Create fileChangesWebview/index.tsx | Task 1 | Entry point needs to know DiffViewer API |
| Task 6: Create FileChangesApp.tsx | Task 5 | Main app component for the new webview |
| Task 7: Create FileChangesPanel.tsx | Task 1, Task 6 | Main panel using DiffViewer with accordion |
| Task 8: Create fileChangesWebview/state.ts | Task 5 | State management for the new webview |
| Task 9: Create CollapsibleFileDiff.tsx | Task 1 | Reusable accordion component with DiffViewer |
| Task 10: Update extension.ts | Task 2, Task 3 | Register new provider and commands |
| Task 11: Update ChatProvider.ts | Task 3 | Share file changes state with new panel |
| Task 12: Add CSS styles | Task 7, Task 9 | Styling for panel and accordion |
| Task 13: Create unit tests | Task 7, Task 9 | TDD - test accordion and panel components |
| Task 14: Integration testing | All above | End-to-end verification |

---

## Parallel Execution Graph

### Wave 1 (Start immediately - No dependencies)
- ✅ **Task 1**: Analyze @pierre/diffs API
- ✅ **Task 2**: Update package.json contributions  
- ✅ **Task 4**: Update esbuild.js

### Wave 2 (After Wave 1 completes)
- **Task 3**: Create FileChangesPanelProvider.ts
- **Task 5**: Create fileChangesWebview/index.tsx
- **Task 9**: Create CollapsibleFileDiff.tsx

### Wave 3 (After Wave 2 completes)
- **Task 6**: Create FileChangesApp.tsx
- **Task 8**: Create fileChangesWebview/state.ts
- **Task 12**: Add CSS styles (partial - base styles)

### Wave 4 (After Wave 3 completes)
- **Task 7**: Create FileChangesPanel.tsx
- **Task 13**: Create unit tests

### Wave 5 (After Wave 4 completes)
- **Task 10**: Update extension.ts
- **Task 11**: Update ChatProvider.ts
- **Task 12**: Add CSS styles (remaining - integration styles)

### Wave 6 (After Wave 5 completes)
- **Task 14**: Integration testing

**Critical Path:** Task 1 → Task 3 → Task 10 → Task 14  
**Estimated Parallel Speedup:** ~50% faster than sequential

---

## Detailed Task Specifications

### Task 2: Update package.json contributions

**File:** `package.json`

**Changes:**
```json
{
  "commands": [
    {
      "command": "opencode.showFileChanges",
      "title": "opencode: Show File Changes",
      "icon": "$(diff)"
    }
  ],
  "keybindings": [
    {
      "command": "opencode.showFileChanges",
      "key": "cmd+shift+d",
      "mac": "cmd+shift+d",
      "win": "ctrl+shift+d",
      "linux": "ctrl+shift+d"
    }
  ]
}
```

---

### Task 3: Create FileChangesPanelProvider.ts

**File:** `src/FileChangesPanelProvider.ts`

**Purpose:** Manage the standalone file changes webview panel

**Implementation:**
```typescript
import * as vscode from "vscode"
import * as path from "path"
import * as crypto from "crypto"
import type { FileDiff } from "./types"
import type { HostMessage } from "./types"

export class FileChangesPanelProvider {
  private panel?: vscode.WebviewPanel
  private currentSessionID?: string
  private currentDiffs: FileDiff[] = []

  constructor(private ctx: vscode.ExtensionContext) {}

  public show(sessionID: string, diffs: FileDiff[]): void {
    this.currentSessionID = sessionID
    this.currentDiffs = diffs

    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Two)
      this.updateContent()
    } else {
      this.createPanel()
    }
  }

  public updateDiffs(sessionID: string, diffs: FileDiff[]): void {
    if (this.currentSessionID === sessionID) {
      this.currentDiffs = diffs
      this.updateContent()
    }
  }

  private createPanel(): void {
    this.panel = vscode.window.createWebviewPanel(
      "opencode.fileChanges",
      "File Changes",
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        localResourceRoots: [this.ctx.extensionUri],
        retainContextWhenHidden: true,
      }
    )

    this.panel.webview.html = this.getHtml(this.panel.webview)
    this.panel.webview.onDidReceiveMessage((msg) => this.handleMessage(msg))
    
    this.panel.onDidDispose(() => {
      this.panel = undefined
    })

    this.updateContent()
  }

  private updateContent(): void {
    if (!this.panel) return
    
    const msg: HostMessage = {
      type: "session.diff",
      sessionID: this.currentSessionID!,
      diffs: this.currentDiffs
    }
    
    this.panel.webview.postMessage(msg)
  }

  private handleMessage(msg: unknown): void {
    // Handle messages from webview (file.open, file.diff)
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = crypto.randomBytes(16).toString("hex")
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.ctx.extensionUri, "dist", "fileChangesWebview.js")
    )
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.ctx.extensionUri, "dist", "fileChangesWebview.css")
    )
    const cspSource = webview.cspSource
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${cspSource} data:;">
<link rel="stylesheet" href="${styleUri}">
<title>File Changes</title>
</head>
<body>
<div id="root"></div>
<script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`
  }

  public dispose(): void {
    this.panel?.dispose()
  }
}
```

---

### Task 4: Update esbuild.js

**File:** `esbuild.js`

**Changes:**
```javascript
/**
 * Build configuration for File Changes Webview (Browser/React)
 */
async function buildFileChangesWebview() {
  console.log("Building file changes webview...")

  const ctx = await esbuild.context({
    entryPoints: ["fileChangesWebview/index.tsx"],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    outfile: "dist/fileChangesWebview.js",
    logLevel: watch ? "silent" : "info",
  })

  if (watch) {
    await ctx.watch()
    console.log("[watch] File changes webview watching...")
  } else {
    await ctx.rebuild()
    await ctx.dispose()
    console.log("✓ dist/fileChangesWebview.js")
    console.log("✓ dist/fileChangesWebview.css")
  }
}
```

And update `main()`:
```javascript
if (!target || target === "webview") {
  tasks.push(buildWebview())
  tasks.push(buildFileChangesWebview())
}
```

---

### Task 5: Create fileChangesWebview/index.tsx

**File:** `fileChangesWebview/index.tsx`

**Implementation:**
```typescript
import React from "react"
import { createRoot } from "react-dom/client"
import { FileChangesApp } from "./FileChangesApp"

declare function acquireVsCodeApi(): {
  postMessage(msg: unknown): void
  getState(): unknown
  setState(s: unknown): void
}

const vscode = acquireVsCodeApi()

const root = createRoot(document.getElementById("root")!)
root.render(<FileChangesApp vscode={vscode} />)
```

---

### Task 8: Create fileChangesWebview/state.ts

**File:** `fileChangesWebview/state.ts`

**Implementation:**
```typescript
import type { FileDiff } from "../webview/types"

export type AppState = {
  sessionID: string | null
  diffs: FileDiff[]
  expandedFiles: Set<string>
  connected: boolean
}

export const initialState: AppState = {
  sessionID: null,
  diffs: [],
  expandedFiles: new Set(),
  connected: false,
}

export type Action =
  | { type: "session.diff"; sessionID: string; diffs: FileDiff[] }
  | { type: "file.toggle"; filePath: string }
  | { type: "connected" }

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "session.diff":
      return {
        ...state,
        sessionID: action.sessionID,
        diffs: action.diffs,
        expandedFiles: new Set(), // Reset expansions on new diff
      }
    case "file.toggle": {
      const newExpanded = new Set(state.expandedFiles)
      if (newExpanded.has(action.filePath)) {
        newExpanded.delete(action.filePath)
      } else {
        newExpanded.add(action.filePath)
      }
      return { ...state, expandedFiles: newExpanded }
    }
    case "connected":
      return { ...state, connected: true }
    default:
      return state
  }
}
```

---

### Task 9: Create CollapsibleFileDiff.tsx

**File:** `fileChangesWebview/components/CollapsibleFileDiff.tsx`

**Implementation:**
```typescript
import React from "react"
import { FileDiff as DiffViewer } from "@pierre/diffs/react"
import type { FileDiff } from "../../webview/types"

interface Props {
  diff: FileDiff
  isExpanded: boolean
  onToggle: () => void
  onFileOpen: () => void
  onShowDiff: () => void
}

function transformToFileDiffMetadata(diff: FileDiff) {
  const beforeLines = diff.before.split("\n")
  const afterLines = diff.after.split("\n")
  
  // Generate simple hunks for the diff
  const hunks = [{
    oldStart: 1,
    oldCount: beforeLines.length,
    newStart: 1,
    newCount: afterLines.length,
    lines: generateDiffLines(beforeLines, afterLines),
  }]

  return {
    name: diff.file,
    type: "modified" as const,
    hunks,
    deletionLines: beforeLines,
    additionLines: afterLines,
    isPartial: false,
    splitLineCount: Math.max(beforeLines.length, afterLines.length),
    unifiedLineCount: beforeLines.length + afterLines.length,
  }
}

function generateDiffLines(before: string[], after: string[]) {
  // Simplified diff line generation
  const lines: Array<{ type: string; content: string; oldLine?: number; newLine?: number }> = []
  
  // This is a simplified version - real implementation would use proper diff algorithm
  before.forEach((line, i) => {
    lines.push({ type: "deletion", content: line, oldLine: i + 1 })
  })
  after.forEach((line, i) => {
    lines.push({ type: "addition", content: line, newLine: i + 1 })
  })
  
  return lines
}

export function CollapsibleFileDiff({ 
  diff, 
  isExpanded, 
  onToggle, 
  onFileOpen, 
  onShowDiff 
}: Props) {
  const fileName = diff.file.split("/").pop() || diff.file
  const fileDiffMetadata = transformToFileDiffMetadata(diff)

  return (
    <div className="collapsible-file-diff">
      <div 
        className="file-diff-header"
        onClick={onToggle}
      >
        <span className="toggle-icon">{isExpanded ? "▼" : "▶"}</span>
        <span className="file-name" title={diff.file}>{fileName}</span>
        <span className="file-path" title={diff.file}>{diff.file}</span>
        <div className="file-stats">
          {diff.additions > 0 && (
            <span className="additions">+{diff.additions}</span>
          )}
          {diff.deletions > 0 && (
            <span className="deletions">-{diff.deletions}</span>
          )}
        </div>
        <div className="file-actions">
          <button 
            className="action-btn"
            onClick={(e) => { e.stopPropagation(); onFileOpen(); }}
            title="Open file"
          >
            📄
          </button>
          <button 
            className="action-btn"
            onClick={(e) => { e.stopPropagation(); onShowDiff(); }}
            title="Show diff"
          >
            🔍
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="file-diff-content">
          <DiffViewer 
            fileDiff={fileDiffMetadata}
            options={{
              diffStyle: "unified",
              syntaxHighlighting: true,
            }}
          />
        </div>
      )}
    </div>
  )
}
```

---

### Task 7: Create FileChangesPanel.tsx

**File:** `fileChangesWebview/components/FileChangesPanel.tsx`

**Implementation:**
```typescript
import React from "react"
import type { FileDiff } from "../../webview/types"
import { CollapsibleFileDiff } from "./CollapsibleFileDiff"

interface Props {
  sessionID: string | null
  diffs: FileDiff[]
  expandedFiles: Set<string>
  onFileToggle: (filePath: string) => void
  onFileOpen: (path: string, line?: number) => void
  onShowDiff: (path: string, before: string, after: string) => void
}

export function FileChangesPanel({
  sessionID,
  diffs,
  expandedFiles,
  onFileToggle,
  onFileOpen,
  onShowDiff,
}: Props) {
  if (!sessionID) {
    return (
      <div className="file-changes-empty">
        <p>No active session</p>
      </div>
    )
  }

  if (diffs.length === 0) {
    return (
      <div className="file-changes-empty">
        <p>No file changes in this session</p>
      </div>
    )
  }

  const totalAdditions = diffs.reduce((sum, d) => sum + d.additions, 0)
  const totalDeletions = diffs.reduce((sum, d) => sum + d.deletions, 0)

  return (
    <div className="file-changes-panel">
      <div className="file-changes-header">
        <h3>File Changes</h3>
        <div className="header-stats">
          <span>{diffs.length} files</span>
          {totalAdditions > 0 && (
            <span className="additions">+{totalAdditions}</span>
          )}
          {totalDeletions > 0 && (
            <span className="deletions">-{totalDeletions}</span>
          )}
        </div>
      </div>
      
      <div className="file-changes-list">
        {diffs.map((diff) => (
          <CollapsibleFileDiff
            key={diff.file}
            diff={diff}
            isExpanded={expandedFiles.has(diff.file)}
            onToggle={() => onFileToggle(diff.file)}
            onFileOpen={() => {
              const line = calculateFirstChangeLine(diff.before, diff.after)
              onFileOpen(diff.file, line)
            }}
            onShowDiff={() => onShowDiff(diff.file, diff.before, diff.after)}
          />
        ))}
      </div>
    </div>
  )
}

function calculateFirstChangeLine(before: string, after: string): number {
  const beforeLines = before.split("\n")
  const afterLines = after.split("\n")
  
  const minLength = Math.min(beforeLines.length, afterLines.length)
  for (let i = 0; i < minLength; i++) {
    if (beforeLines[i] !== afterLines[i]) {
      return i
    }
  }
  
  if (beforeLines.length !== afterLines.length) {
    return minLength
  }
  
  return 0
}
```

---

### Task 6: Create FileChangesApp.tsx

**File:** `fileChangesWebview/FileChangesApp.tsx`

**Implementation:**
```typescript
import React, { useReducer, useEffect, useCallback } from "react"
import { reducer, initialState } from "./state"
import { FileChangesPanel } from "./components/FileChangesPanel"
import type { HostMessage } from "../src/types"

interface Props {
  vscode: {
    postMessage(msg: unknown): void
    getState(): unknown
    setState(s: unknown): void
  }
}

export function FileChangesApp({ vscode }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    function handle(event: MessageEvent) {
      const msg = event.data as HostMessage
      
      switch (msg.type) {
        case "session.diff":
          dispatch({ type: "session.diff", sessionID: msg.sessionID, diffs: msg.diffs })
          break
      }
    }
    
    window.addEventListener("message", handle)
    vscode.postMessage({ type: "ready" })
    
    return () => window.removeEventListener("message", handle)
  }, [vscode])

  const handleFileToggle = useCallback((filePath: string) => {
    dispatch({ type: "file.toggle", filePath })
  }, [])

  const handleFileOpen = useCallback((path: string, line?: number) => {
    vscode.postMessage({ type: "file.open", path, line })
  }, [vscode])

  const handleShowDiff = useCallback((path: string, before: string, after: string) => {
    vscode.postMessage({ type: "file.diff", path, before, after })
  }, [vscode])

  return (
    <FileChangesPanel
      sessionID={state.sessionID}
      diffs={state.diffs}
      expandedFiles={state.expandedFiles}
      onFileToggle={handleFileToggle}
      onFileOpen={handleFileOpen}
      onShowDiff={handleShowDiff}
    />
  )
}
```

---

### Task 12: CSS Styles

**File:** `fileChangesWebview/styles.css`

**Implementation:**
```css
/* File Changes Panel Styles */

.file-changes-panel {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
}

.file-changes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vscode-panel-border);
  background: var(--vscode-panel-background);
}

.file-changes-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.header-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.header-stats .additions {
  color: #238636;
}

.header-stats .deletions {
  color: #da3633;
}

.file-changes-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.file-changes-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: var(--vscode-descriptionForeground);
  font-size: 14px;
}

/* Collapsible File Diff */

.collapsible-file-diff {
  margin-bottom: 8px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;
  overflow: hidden;
}

.file-diff-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--vscode-panel-background);
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}

.file-diff-header:hover {
  background: var(--vscode-list-hoverBackground);
}

.toggle-icon {
  font-size: 10px;
  color: var(--vscode-descriptionForeground);
  width: 12px;
}

.file-name {
  font-weight: 500;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.file-path {
  flex: 1;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-stats {
  display: flex;
  gap: 8px;
  font-size: 11px;
  font-family: var(--vscode-editor-font-family);
}

.file-stats .additions {
  color: #238636;
}

.file-stats .deletions {
  color: #da3633;
}

.file-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  background: transparent;
  border: none;
  padding: 4px 6px;
  cursor: pointer;
  border-radius: 3px;
  font-size: 12px;
  opacity: 0.7;
  transition: opacity 0.15s, background 0.15s;
}

.action-btn:hover {
  opacity: 1;
  background: var(--vscode-toolbar-hoverBackground);
}

.file-diff-content {
  border-top: 1px solid var(--vscode-panel-border);
  max-height: 400px;
  overflow: auto;
}
```

---

### Task 10: Update extension.ts

**File:** `src/extension.ts`

**Changes:**
```typescript
import * as vscode from "vscode"
import { ChatProvider } from "./provider"
import { FileChangesPanelProvider } from "./FileChangesPanelProvider"
import { DiffContentProvider } from "./diffProvider"

export function activate(ctx: vscode.ExtensionContext): void {
  const diffProvider = new DiffContentProvider()
  const chatProvider = new ChatProvider(ctx, diffProvider)
  const fileChangesProvider = new FileChangesPanelProvider(ctx)

  ctx.subscriptions.push(
    vscode.window.registerWebviewViewProvider("opencode.chat", chatProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.workspace.registerTextDocumentContentProvider("opencode-diff", diffProvider),
    vscode.commands.registerCommand("opencode.newSession", () => chatProvider.newSession()),
    vscode.commands.registerCommand("opencode.focus", () => {
      vscode.commands.executeCommand("opencode.chat.focus")
    }),
    vscode.commands.registerCommand("opencode.attachSelection", () => chatProvider.attachSelection()),
    vscode.commands.registerCommand("opencode.showFileChanges", () => {
      // Show panel with current session's changes
      if (chatProvider.activeSessionID) {
        const diffs = chatProvider.getFileChanges(chatProvider.activeSessionID)
        fileChangesProvider.show(chatProvider.activeSessionID, diffs)
      } else {
        vscode.window.showInformationMessage("No active session")
      }
    }),
    chatProvider,
    fileChangesProvider,
    diffProvider,
  )
}

export function deactivate(): void {}
```

---

### Task 11: Update ChatProvider.ts

**File:** `src/provider.ts`

**Changes:**
Add to ChatProvider class:
```typescript
export class ChatProvider implements vscode.WebviewViewProvider {
  // ... existing code ...
  
  private fileChangesProvider: FileChangesPanelProvider
  public activeSessionID: string | null = null
  private fileChanges: Map<string, FileDiff[]> = new Map()

  constructor(
    private ctx: vscode.ExtensionContext, 
    private diffProvider: DiffContentProvider,
    fileChangesProvider: FileChangesPanelProvider
  ) {
    this.fileChangesProvider = fileChangesProvider
    // ... rest of constructor ...
  }

  public getFileChanges(sessionID: string): FileDiff[] {
    return this.fileChanges.get(sessionID) || []
  }

  // In handleMessage, update session.diff handling:
  case "session.select": {
    // ... existing code ...
    this.activeSessionID = msg.sessionID
    
    // Load session diff
    const diffResult = await this.client.session.diff({ 
      path: { id: msg.sessionID }, 
      query: { directory: this.directory } 
    })
    if (diffResult.data) {
      this.fileChanges.set(msg.sessionID, diffResult.data)
      this.post({ type: "session.diff", sessionID: msg.sessionID, diffs: diffResult.data })
      // Also update the file changes panel
      this.fileChangesProvider.show(msg.sessionID, diffResult.data)
    }
    break
  }

  // In startEventLoop, handle session.diff events:
  case "session.diff": {
    const { sessionID, diff } = properties as { sessionID: string; diff: FileDiff[] }
    this.fileChanges.set(sessionID, diff)
    this.fileChangesProvider.updateDiffs(sessionID, diff)
    break
  }
}
```

---

## Commit Strategy

**Atomic Commits (in dependency order):**

1. `build: add file changes webview entry point to esbuild`
2. `feat: add FileChangesPanelProvider for standalone panel`
3. `feat: add file changes webview components and state`
4. `feat: integrate file changes panel with ChatProvider`
5. `feat: add CSS styles for file changes panel`
6. `test: add unit tests for file changes components`
7. `chore: update package.json with new commands and keybindings`

---

## Success Criteria

**Functional Requirements:**
- [ ] Command "opencode: Show File Changes" opens panel on right side
- [ ] Panel displays file changes for active session
- [ ] Each file shown as collapsible accordion (default: collapsed)
- [ ] Clicking file header expands to show DiffViewer
- [ ] File stats (additions/deletions) visible in header
- [ ] Buttons to open file and show diff available

**Integration Requirements:**
- [ ] Panel updates when switching sessions
- [ ] Panel receives real-time diff updates from events
- [ ] State synchronized between sidebar and panel

**Quality Requirements:**
- [ ] All unit tests pass
- [ ] No TypeScript errors
- [ ] Build completes successfully
- [ ] Follows existing code style (no semicolons, double quotes, 120 char width)

---

## Execution Ready Checklist

- [x] @pierre/diffs API analyzed
- [x] package.json commands added
- [x] esbuild.js updated for second entry point
- [ ] FileChangesPanelProvider.ts created
- [ ] fileChangesWebview/index.tsx created
- [ ] fileChangesWebview/state.ts created
- [ ] CollapsibleFileDiff.tsx created
- [ ] FileChangesPanel.tsx created
- [ ] FileChangesApp.tsx created
- [ ] CSS styles added
- [ ] extension.ts updated
- [ ] ChatProvider.ts updated
- [ ] Unit tests created
- [ ] Integration tests completed
