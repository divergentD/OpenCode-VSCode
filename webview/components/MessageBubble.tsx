import React, { useState } from "react"
import type { MessageInfo, PartData, TextPartData, ToolPartData, ReasoningPartData, PatchPartData } from "../types"
import type { WebviewMessage } from "../types"

type Props = {
  message: MessageInfo
  partDeltas: Record<string, string>
  post: (msg: WebviewMessage) => void
}

export function MessageBubble({ message, partDeltas, post }: Props) {
  const isUser = message.role === "user"

  return (
    <div className={`message ${isUser ? "user" : "assistant"}`}>
      {/* Avatar */}
      <div className="message-avatar">{isUser ? "U" : "AI"}</div>

      {/* Content */}
      <div className="message-content">
        {isUser ? (
          <UserMessageContent message={message} />
        ) : (
          <AssistantMessageContent message={message} partDeltas={partDeltas} post={post} />
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
  post,
}: {
  message: MessageInfo
  partDeltas: Record<string, string>
  post: (msg: WebviewMessage) => void
}) {
  const parts = message.parts ?? []

  return (
    <div className="message-parts">
      {parts.map((part) => (
        <Part key={part.id} part={part} delta={partDeltas[part.id]} post={post} />
      ))}
    </div>
  )
}

function Part({ part, delta, post }: { part: PartData; delta?: string; post: (msg: WebviewMessage) => void }) {
  switch (part.type) {
    case "text":
      return <TextPart part={part as TextPartData} delta={delta} />
    case "tool":
      return <ToolCallPart part={part as ToolPartData} />
    case "reasoning":
      return <ReasoningPart part={part as ReasoningPartData} />
    case "patch":
      return <PatchPart part={part as PatchPartData} post={post} />
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

// Simple markdown renderer using dangerouslySetInnerHTML with basic parsing
function renderMarkdown(text: string): string {
  if (!text) return ""
  let html = text
    // Escape HTML first
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Code blocks
    .replace(
      /```([a-zA-Z]*)\n([\s\S]*?)```/g,
      (_, lang, code) => `<pre><code class="lang-${lang || "text"}">${code.trimEnd()}</code></pre>`,
    )
    // Inline code
    .replace(/`([^`\n]+)`/g, "<code>$1</code>")
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    // Headers
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bullet lists
    .replace(/^[*-] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
    // Paragraphs: split by double newline
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

function PatchPart({ part, post }: { part: PatchPartData; post: (msg: WebviewMessage) => void }) {
  if (!part.files?.length) return null

  const handleOpenFile = (filePath: string) => {
    console.log('[PatchPart] Opening file:', filePath)
    post({ type: "file.open", path: filePath })
  }

  return (
    <div className="part-patch">
      <div className="patch-header">File Changes</div>
      <div className="patch-files">
        {part.files.map((filePath, i) => (
          <div key={i} className="patch-file">
            <span 
              className="patch-path" 
              onClick={() => handleOpenFile(filePath)} 
              title="Click to open file"
            >
              {filePath}
            </span>
            <button 
              className="patch-open-btn" 
              onClick={() => handleOpenFile(filePath)} 
              title="Open file"
            >
              📄
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
