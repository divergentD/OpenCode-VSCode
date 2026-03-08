import React, { useState } from "react"
import type { MessageInfo, PartData, TextPartData, ToolPartData, ReasoningPartData, PatchPartData } from "../types"

type Props = {
  message: MessageInfo
  partDeltas: Record<string, string>
}

export function MessageBubble({ message, partDeltas }: Props) {
  // DEBUG: Log message structure
  console.log("[MessageBubble] Rendering message:", {
    id: message.id,
    role: message.role,
    partsCount: message.parts?.length ?? 0,
    parts: message.parts,
    partDeltas: partDeltas,
    rawMessage: message
  })
  if (message.role === "user") {
    const textParts = (message.parts ?? []).filter((p): p is TextPartData => p.type === "text")
    const text = textParts.map((p) => p.text).join("\n")
    console.log("[MessageBubble] User text parts:", textParts.length, "text:", text.substring(0, 100))
    return (
      <div className="message-user">
        {text || <span style={{ opacity: 0.5 }}>[empty]</span>}
        {message.error && (
          <div style={{ color: "var(--vscode-errorForeground)", fontSize: "11px", marginTop: "4px" }}>
            {message.error.message}
          </div>
        )}
      </div>
    )
  }

  // Assistant message — render each part
  return (
    <div className="message-assistant">
      {(message.parts ?? []).map((part) => (
        <Part key={part.id} part={part} delta={partDeltas[part.id]} />
      ))}
      {message.error && (
        <div style={{ padding: "4px 12px", color: "var(--vscode-errorForeground)", fontSize: "12px" }}>
          ⚠ {message.error.message}
        </div>
      )}
    </div>
  )
}

function Part({ part, delta }: { part: PartData; delta?: string }) {
  switch (part.type) {
    case "text":
      return <TextPart part={part as TextPartData} delta={delta} />
    case "tool":
      return <ToolCallPart part={part as ToolPartData} />
    case "reasoning":
      return <ReasoningPart part={part as ReasoningPartData} />
    case "patch":
      return <PatchPart part={part as PatchPartData} />
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
// We avoid marked/DOMPurify dependency complexity — do basic replacement
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
  console.log("[TextPart] Rendering:", { partID: part.id, delta, partText: part.text, finalText: text })
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
        <span>{icon}</span>
        <span className="tool-call-name">{part.toolName}</span>
        {title && title !== part.toolName && <span className="tool-call-title">— {title}</span>}
        <span style={{ marginLeft: "auto", fontSize: "10px", opacity: 0.5 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div className="tool-call-body">
          {error ? (
            <span style={{ color: "var(--vscode-errorForeground)" }}>{error}</span>
          ) : output ? (
            output
          ) : input ? (
            JSON.stringify(input, null, 2)
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
        <span style={{ fontSize: "10px" }}>{open ? "▲" : "▼"}</span>
        <span>Reasoning</span>
      </div>
      {open && <div className="part-reasoning-body">{part.text}</div>}
    </div>
  )
}

function PatchPart({ part }: { part: PatchPartData }) {
  if (!part.files?.length) return null
  return (
    <div className="part-patch">
      {part.files.map((f, i) => (
        <div key={i} className="patch-file">
          <span className="patch-path">{f.path}</span>
          {f.additions > 0 && <span className="patch-additions">+{f.additions}</span>}
          {f.deletions > 0 && <span className="patch-deletions">-{f.deletions}</span>}
        </div>
      ))}
    </div>
  )
}
