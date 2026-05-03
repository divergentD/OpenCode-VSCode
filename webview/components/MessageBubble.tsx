import React, { useState, useEffect } from "react"
import { FileDiffItem, calculateFirstChangeLine } from "../../packages/ui/src/file-diff"
import type { MessageInfo, PartData, TextPartData, ToolPartData, ReasoningPartData, PatchPartData, FileDiff as FileDiffType } from "../types"
import type { WebviewMessage } from "../types"
import { renderMarkdown } from "../utils/markdown"
import "./MessageBubble.css"

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

function TextPart({ part, delta }: { part: TextPartData; delta?: string }) {
  const text = delta ?? part.text ?? ""
  if (!text) return null
  return <div className="part-text markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
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
  if (!part.text) return null
  return <div className="part-reasoning">{part.text}</div>
}

function FileDiffView({ diff, filePath, post }: {
  diff: FileDiffType
  filePath: string
  post: (msg: WebviewMessage) => void
}) {
  return (
    <FileDiffItem 
      diff={{
        file: filePath,
        ...(diff.before !== undefined && { before: diff.before }),
        ...(diff.after !== undefined && { after: diff.after }),
        ...(diff.patch !== undefined && { patch: diff.patch }),
        additions: diff.additions,
        deletions: diff.deletions
      }}
      callbacks={{
        onFileOpen: (path, line) => post({ type: "file.open", path, line }),
        onShowDiff: (path, before, after, patch) => {
          post({ type: "file.diff", path, before, after, patch })
        }
      }}
    />
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
    if (diff && diff.before !== undefined && diff.after !== undefined) {
      line = calculateFirstChangeLine(diff.before, diff.after)
      console.log('[PatchPart] First change at line:', line)
    }
    post({ type: "file.open", path: filePath, line })
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
              post={post}
            />
          )
        })}
      </div>
    </div>
  )
}