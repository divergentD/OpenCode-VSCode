import React, { useState, useEffect } from "react"
import { FileDiffItem, calculateFirstChangeLine } from "../../packages/ui/src/file-diff"
import { ChevronDownIcon, ChevronRightIcon } from "../../packages/ui/src/primitives/Icon"
import { renderMarkdown } from "../utils/markdown"
import type { MessageInfo, PartData, TextPartData, ToolPartData, ReasoningPartData, PatchPartData, SubtaskPartData, AgentPartData, FileDiff as FileDiffType, AgentInfo } from "../types"
import type { WebviewMessage } from "../types"

interface Props {
  message: MessageInfo
  partDeltas: Record<string, string>
  fileChanges: FileDiffType[]
  post: (msg: WebviewMessage) => void
  agents?: AgentInfo[]
}

export function MessageBubble({ message, partDeltas, fileChanges, post, agents }: Props) {
  const isUser = message.role === "user"

  return (
    <div className={`message ${isUser ? "user" : "assistant"}`}>
      <div className="message-avatar">{isUser ? "U" : "AI"}</div>

      <div className="message-content">
        {isUser ? (
          <UserMessageContent message={message} />
        ) : (
          <AssistantMessageContent message={message} partDeltas={partDeltas} fileChanges={fileChanges} post={post} agents={agents} />
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

function getToolIdentifier(part: ToolPartData): string {
  return part.toolName || part.tool || ""
}

function isExplorationTool(part: PartData): boolean {
  if (part.type !== "tool") return false
  const toolPart = part as ToolPartData
  const id = getToolIdentifier(toolPart)
  return id === "glob" || id === "read"
}

type GroupedPart =
  | { type: "single"; part: PartData }
  | { type: "tool-group"; parts: ToolPartData[] }

function groupToolCalls(parts: PartData[]): GroupedPart[] {
  const result: GroupedPart[] = []
  let i = 0

  while (i < parts.length) {
    const part = parts[i]

    if (isExplorationTool(part)) {
      const group: ToolPartData[] = [part as ToolPartData]
      let j = i + 1

      while (j < parts.length && isExplorationTool(parts[j])) {
        group.push(parts[j] as ToolPartData)
        j++
      }

      result.push({ type: "tool-group", parts: group })
      i = j
    } else {
      result.push({ type: "single", part })
      i++
    }
  }

  return result
}

function AssistantMessageContent({
  message,
  partDeltas,
  fileChanges,
  post,
  agents,
}: {
  message: MessageInfo
  partDeltas: Record<string, string>
  fileChanges: FileDiffType[]
  post: (msg: WebviewMessage) => void
  agents?: AgentInfo[]
}) {
  const parts = message.parts ?? []
  const grouped = groupToolCalls(parts)

  return (
    <div className="message-parts">
      {grouped.map((group, index) => {
        if (group.type === "single") {
          return (
            <Part
              key={group.part.id}
              part={group.part}
              delta={partDeltas[group.part.id]}
              fileChanges={fileChanges}
              post={post}
              agents={agents}
            />
          )
        } else {
          return <ToolCallGroup key={`group-${index}`} parts={group.parts} />
        }
      })}
    </div>
  )
}

function Part({ part, delta, fileChanges, post, agents }: { part: PartData; delta?: string; fileChanges: FileDiffType[]; post: (msg: WebviewMessage) => void; agents?: AgentInfo[] }) {
  switch (part.type) {
    case "text":
      return <TextPart part={part as TextPartData} delta={delta} />
    case "tool":
      return <ToolCallPart part={part as ToolPartData} post={post} agents={agents} />
    case "reasoning":
      return <ReasoningPart part={part as ReasoningPartData} />
    case "patch":
      return <PatchPart part={part as PatchPartData} fileChanges={fileChanges} post={post} />
    case "subtask":
      return <SubtaskPart part={part as SubtaskPartData} post={post} />
    case "agent":
      return <AgentPart part={part as AgentPartData} post={post} />
    case "step-start":
    case "step-finish":
    case "compaction":
    case "snapshot":
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

function ToolCallPart({ part, post, agents }: { part: ToolPartData; post: (msg: WebviewMessage) => void; agents?: AgentInfo[] }) {
  const [open, setOpen] = useState(false)
  const { status, title, input, output, error } = part.state

  if (part.toolName === "task" || part.tool === "task") {
    const taskInput = input as { description?: string; sessionId?: string; subagent_type?: string } | undefined
    const description = taskInput?.description || title || "Subtask"
    const agentType = taskInput?.subagent_type || "subtask"

    let sessionId = taskInput?.sessionId
    if (!sessionId && output) {
      const match = output.match(/session_id:\s*(ses_[a-zA-Z0-9]+)/)
      if (match) {
        sessionId = match[1]
      }
    }

    const toTitleCase = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()

    const statusIcon = status === "pending" ? "○" : status === "running" ? "◐" : status === "error" ? "✕" : "✓"
    const statusClass = `subtask-status ${status}`
    
    // Get agent color from agents list or use dynamic color
    const agentInfo = agents?.find(a => a.name.toLowerCase() === agentType.toLowerCase())
    const agentColor = agentInfo?.color || "var(--vscode-textLink-foreground)"

    const handleEnterSubtask = () => {
      if (sessionId) {
        post({ type: "session.select", sessionID: sessionId })
      }
    }

    return (
      <div className="subtask-card" onClick={handleEnterSubtask} style={{ cursor: sessionId ? "pointer" : "default" }}>
        <div className="subtask-header">
          <span className={statusClass}>{statusIcon}</span>
          <span className="subtask-agent" style={{ color: agentColor }}>{toTitleCase(agentType)}</span>
          <span className="subtask-title">{description}</span>
        </div>
        {error && <div className="subtask-description" style={{ color: "var(--vscode-errorForeground)" }}>{error}</div>}
      </div>
    )
  }

  const toolIdentifier = part.toolName || part.tool || ""

  // glob and read are rendered in aggregated groups by ToolCallGroup
  if (toolIdentifier === "glob" || toolIdentifier === "read") {
    return null
  }

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

function ToolCallGroup({ parts }: { parts: ToolPartData[] }) {
  const [expanded, setExpanded] = useState(false)

  const isRunning = parts.some((p) => p.state.status === "running")
  const statusLabel = isRunning ? "探索中" : "已探索"

  const globCount = parts.filter((p) => getToolIdentifier(p) === "glob").length
  const readCount = parts.filter((p) => getToolIdentifier(p) === "read").length

  const summaryParts: string[] = []
  if (globCount > 0) summaryParts.push(`${globCount}次搜索`)
  if (readCount > 0) summaryParts.push(`${readCount}次读取`)
  const summary = summaryParts.join("，")

  return (
    <div className="tool-call-group">
      <div
        className={`tool-call-group-header ${isRunning ? "running" : ""}`}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="group-status">{statusLabel}</span>
        <span className="group-summary">{summary}</span>
        <span className="group-toggle">
          {expanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
        </span>
      </div>
      {expanded && (
        <div className="tool-call-group-body">
          {parts.map((part, i) => (
            <ToolCallCompact key={`${part.id}-${i}`} part={part} />
          ))}
        </div>
      )}
    </div>
  )
}

function ToolCallCompact({ part }: { part: ToolPartData }) {
  const toolName = getToolIdentifier(part)
  const { status, input } = part.state

  if (toolName === "glob") {
    const pattern = (input as { pattern?: string })?.pattern
    return (
      <div className={`tool-call-compact ${status}`}>
        <span className="compact-name">Glob</span>
        {pattern && <span className="compact-detail">/ pattern={pattern}</span>}
      </div>
    )
  }

  if (toolName === "read") {
    const readInput = input as { filePath?: string; offset?: number; limit?: number } | undefined
    const filePath = readInput?.filePath

    const params: string[] = []
    if (readInput?.offset !== undefined) params.push(`offset=${readInput.offset}`)
    if (readInput?.limit !== undefined) params.push(`limit=${readInput.limit}`)
    const paramStr = params.length > 0 ? params.join(" ") : ""

    return (
      <div className={`tool-call-compact ${status}`}>
        <span className="compact-name">读取</span>
        {filePath && <span className="compact-detail">{filePath} {paramStr}</span>}
      </div>
    )
  }

  return null
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

function SubtaskPart({ part, post }: { part: SubtaskPartData; post: (msg: WebviewMessage) => void }) {
  const status = part.status || "pending"
  const statusIcon = status === "pending" ? "○" : status === "running" ? "◐" : status === "error" ? "✕" : "✓"
  const statusClass = `subtask-status ${status}`

  const handleEnterSubtask = () => {
    if (part.sessionID) {
      post({ type: "session.select", sessionID: part.sessionID })
    }
  }

  return (
    <div className="subtask-card">
      <div className="subtask-header">
        <span className={statusClass}>{statusIcon}</span>
        <span className="subtask-title">{part.title || "Sub-task"}</span>
      </div>
      {part.description && (
        <div className="subtask-description">{part.description}</div>
      )}
      {part.sessionID && (
        <button className="subtask-enter-btn" onClick={handleEnterSubtask}>
          Enter sub-task →
        </button>
      )}
    </div>
  )
}

function AgentPart({ part, post }: { part: AgentPartData; post: (msg: WebviewMessage) => void }) {
  const status = part.status || "pending"
  const statusIcon = status === "pending" ? "○" : status === "running" ? "◐" : status === "error" ? "✕" : "✓"
  const statusClass = `subtask-status ${status}`

  const handleEnterSubtask = () => {
    if (part.sessionID) {
      post({ type: "session.select", sessionID: part.sessionID })
    }
  }

  return (
    <div className="subtask-card agent">
      <div className="subtask-header">
        <span className={statusClass}>{statusIcon}</span>
        <span className="subtask-title">{part.title || "Agent Task"}</span>
      </div>
      {part.description && (
        <div className="subtask-description">{part.description}</div>
      )}
      {part.sessionID && (
        <button className="subtask-enter-btn" onClick={handleEnterSubtask}>
          Enter agent task →
        </button>
      )}
    </div>
  )
}