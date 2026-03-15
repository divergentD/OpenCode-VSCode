import React, { useState, useEffect, useMemo } from "react"
import { FileDiff } from "@pierre/diffs/react"
import { parseDiffFromFile } from "@pierre/diffs"
import type { FileDiffMetadata } from "@pierre/diffs"
import type { MessageInfo, PartData, TextPartData, ToolPartData, ReasoningPartData, PatchPartData, FileDiff as FileDiffType } from "../types"
import type { WebviewMessage } from "../types"

type Props = {
  message: MessageInfo
  partDeltas: Record<string, string>
  fileChanges: FileDiffType[]
  post: (msg: WebviewMessage) => void
}

export function MessageBubble({ message, partDeltas, fileChanges, post }: Props) {
  const isUser = message.role === "user"

  return (
    <div className={`message ${isUser ? "user" : "assistant"}`}>
      <div className="message-avatar">{isUser ? "U" : "AI"}</div>

      <div className="message-content">
        {isUser ? (
          <UserMessageContent message={message} />
        ) : (
          <AssistantMessageContent message={message} partDeltas={partDeltas} fileChanges={fileChanges} post={post} />
        )}
        {message.error && (
          <div className="message-error">⚠ {message.error.message}</div>
        )}
      </div>
    </div>
  )
}

function UserMessageContent({ message }: { message: MessageInfo }) {
  const textParts = (message.parts ?? []).filter((p): p is TextPartData => p.type === "text")
  const text = textParts.map((p) => p.text).join("\n")

  return (
    <div className="message-bubble user">
      {text || <span style={{ opacity: 0.5 }}>[empty]</span>}
    </div>
  )
}

function AssistantMessageContent({
  message,
  partDeltas,
  fileChanges,
  post,
}: {
  message: MessageInfo
  partDeltas: Record<string, string>
  fileChanges: FileDiffType[]
  post: (msg: WebviewMessage) => void
}) {
  const parts = message.parts ?? []

  return (
    <div className="message-parts">
      {parts.map((part) => (
        <Part key={part.id} part={part} delta={partDeltas[part.id]} fileChanges={fileChanges} post={post} />
      ))}
    </div>
  )
}

function Part({ part, delta, fileChanges, post }: { part: PartData; delta?: string; fileChanges: FileDiffType[]; post: (msg: WebviewMessage) => void }) {
  switch (part.type) {
    case "text":
      return <TextPart part={part as TextPartData} delta={delta} />
    case "tool":
      return <ToolCallPart part={part as ToolPartData} />
    case "reasoning":
      return <ReasoningPart part={part as ReasoningPartData} />
    case "patch":
      return <PatchPart part={part as PatchPartData} fileChanges={fileChanges} post={post} />
    case "step-start":
    case "step-finish":
    case "compaction":
    case "snapshot":
    case "subtask":
    case "agent":
    case "retry":
      return null
    default:
      return null
  }
}

function renderMarkdown(text: string): string {
  if (!text) return ""
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /```([a-zA-Z]*)\n([\s\S]*?)```/g,
      (_, lang, code) => `<pre><code class="lang-${lang || "text"}">${code.trimEnd()}</code></pre>`,
    )
    .replace(/`([^`\n]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^[*-] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
    .split(/\n\n+/)
    .map((para) => (para.startsWith("<") ? para : `<p>${para.replace(/\n/g, "<br>")}</p>`))
    .join("\n")
  return html
}

function TextPart({ part, delta }: { part: TextPartData; delta?: string }) {
  const text = delta ?? part.text ?? ""
  if (!text) return null
  return <div className="part-text" dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
}

function ToolCallPart({ part }: { part: ToolPartData }) {
  const [open, setOpen] = useState(false)
  const { status, title, input, output, error } = part.state
  const icon = status === "pending" ? "⏳" : status === "running" ? "⚡" : status === "error" ? "✕" : "✓"
  const label = title ?? part.toolName

  return (
    <div className={`tool-call ${status}`}>
      <div className="tool-call-header" onClick={() => setOpen((v) => !v)}>
        <span className="tool-call-icon">{icon}</span>
        <span className="tool-call-name">{part.toolName}</span>
        {label && label !== part.toolName && <span className="tool-call-title">{label}</span>}
        <span className="tool-call-toggle">{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div className="tool-call-body">
          {error ? (
            <span className="tool-call-error">{error}</span>
          ) : output ? (
            <pre className="tool-call-output">{output}</pre>
          ) : input ? (
            <pre className="tool-call-input">{JSON.stringify(input, null, 2)}</pre>
          ) : (
            <span style={{ opacity: 0.5 }}>No output</span>
          )}
        </div>
      )}
    </div>
  )
}

function ReasoningPart({ part }: { part: ReasoningPartData }) {
  const [open, setOpen] = useState(false)
  if (!part.text) return null
  return (
    <div className="part-reasoning">
      <div className="part-reasoning-header" onClick={() => setOpen((v) => !v)}>
        <span className="reasoning-toggle">{open ? "▲" : "▼"}</span>
        <span className="reasoning-label">Reasoning</span>
      </div>
      {open && <div className="part-reasoning-body">{part.text}</div>}
    </div>
  )
}

function calculateFirstChangeLine(before: string, after: string): number {
  const beforeLines = before.split('\n')
  const afterLines = after.split('\n')

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

function FileDiffView({ diff, filePath, onOpenFile, onShowDiff }: {
  diff: FileDiffType
  filePath: string
  onOpenFile: () => void
  onShowDiff: () => void
}) {
  const fileName = filePath.split('/').pop() || filePath
  
  const fileDiffMetadata = useMemo<FileDiffMetadata>(() => {
    return parseDiffFromFile(
      {
        name: fileName,
        contents: diff.before,
      },
      {
        name: fileName,
        contents: diff.after,
      }
    )
  }, [diff.before, diff.after, fileName])

  return (
    <div className="file-diff-view">
      <div className="file-diff-header">
        <div className="file-diff-title">
          <span className="file-diff-name">{fileName}</span>
          <span className="file-diff-stats">
            {diff.additions > 0 && <span className="file-diff-add">+{diff.additions}</span>}
            {diff.deletions > 0 && <span className="file-diff-del">-{diff.deletions}</span>}
          </span>
        </div>
        <div className="file-diff-actions">
          <button
            className="file-diff-btn"
            onClick={onOpenFile}
            title="打开文件并跳转到第一处变更"
          >
            📄
          </button>
          <button
            className="file-diff-btn"
            onClick={onShowDiff}
            title="在 VS Code 中显示差异"
          >
            🔍
          </button>
        </div>
      </div>
      <div className="file-diff-content pierre-diff-container">
        <FileDiff
          fileDiff={fileDiffMetadata}
          options={{
            diffStyle: 'unified',
            theme: 'pierre-dark',
            disableLineNumbers: false,
            expandUnchanged: false,
            expansionLineCount: 5,
          }}
        />
      </div>
    </div>
  )
}

function PatchPart({ part, fileChanges, post }: { part: PatchPartData; fileChanges: FileDiffType[]; post: (msg: WebviewMessage) => void }) {
  if (!part.files?.length) return null

  useEffect(() => {
    console.log('[PatchPart] fileChanges updated:', fileChanges.length, 'items')
    console.log('[PatchPart] files in part:', part.files)
  }, [fileChanges, part.files])

  const handleOpenFile = (filePath: string, diff?: FileDiffType) => {
    console.log('[PatchPart] Opening file:', filePath)
    let line = 0
    if (diff) {
      line = calculateFirstChangeLine(diff.before, diff.after)
      console.log('[PatchPart] First change at line:', line)
    }
    post({ type: "file.open", path: filePath, line })
  }

  const handleShowDiff = (filePath: string, diff?: FileDiffType) => {
    console.log('[PatchPart] Showing diff for:', filePath)
    if (diff) {
      post({ type: "file.diff", path: filePath, before: diff.before, after: diff.after })
    }
  }

  const getFileDiff = (filePath: string): FileDiffType | undefined => {
    let diff = fileChanges.find(fc => fc.file === filePath)
    if (diff) return diff

    const fileName = filePath.split('/').pop()
    if (fileName) {
      diff = fileChanges.find(fc => {
        const fcFileName = fc.file.split('/').pop()
        return fcFileName === fileName
      })
    }

    console.log('[PatchPart] Looking for:', filePath, 'Found:', diff ? 'yes' : 'no')
    return diff
  }

  return (
    <div className="part-patch">
      <div className="patch-header">
        <span>File Changes</span>
        <span className="patch-file-count">{part.files.length} files</span>
      </div>
      <div className="patch-files">
        {part.files.map((filePath, i) => {
          const diff = getFileDiff(filePath)

          if (!diff) {
            const fileName = filePath.split('/').pop() || filePath
            return (
              <div key={i} className="patch-file-simple">
                <span className="patch-path-simple">{fileName}</span>
                <button
                  className="patch-btn-simple"
                  onClick={() => handleOpenFile(filePath)}
                  title="打开文件"
                >
                  📄
                </button>
              </div>
            )
          }

          return (
            <FileDiffView
              key={i}
              diff={diff}
              filePath={filePath}
              onOpenFile={() => handleOpenFile(filePath, diff)}
              onShowDiff={() => handleShowDiff(filePath, diff)}
            />
          )
        })}
      </div>
    </div>
  )
}