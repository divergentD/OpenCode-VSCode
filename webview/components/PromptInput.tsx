import React, { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react"
import type { WebviewMessage, PromptPart, SelectionContext, ProblemContext, CommandInfo } from "../types"
import { MentionMenu } from "./MentionMenu"
import { CommandMenu } from "./CommandMenu"

type Chip =
  | { kind: "selection"; context: SelectionContext }
  | { kind: "problems"; items: ProblemContext[] }
  | { kind: "terminal"; text: string }
  | { kind: "file"; path: string; content?: string }

type Props = {
  disabled: boolean
  sessionID: string | null
  contextResolved: {
    selection?: SelectionContext
    problems?: ProblemContext[]
    terminal?: string
    files?: unknown[]
  }
  post: (msg: WebviewMessage) => void
  commands: CommandInfo[]
}

export function PromptInput({ disabled, sessionID, contextResolved, post, commands }: Props) {
  const [text, setText] = useState("")
  const [chips, setChips] = useState<Chip[]>([])
  const [showMenu, setShowMenu] = useState(false)
  const [menuQuery, setMenuQuery] = useState("")
  const [menuActiveIdx, setMenuActiveIdx] = useState(0)
  const [pendingKind, setPendingKind] = useState<"selection" | "problems" | "terminal" | null>(null)
  const [showCommandMenu, setShowCommandMenu] = useState(false)
  const [commandQuery, setCommandQuery] = useState("")
  const [commandActiveIdx, setCommandActiveIdx] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const prevContextRef = useRef(contextResolved)

  useLayoutEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
  }, [text])

  useEffect(() => {
    const prev = prevContextRef.current
    prevContextRef.current = contextResolved

    if (pendingKind === "selection" && contextResolved.selection !== prev.selection && contextResolved.selection) {
      setChips((c) => [...c, { kind: "selection", context: contextResolved.selection! }])
      setPendingKind(null)
    }
    if (pendingKind === "problems" && contextResolved.problems !== prev.problems && contextResolved.problems) {
      setChips((c) => [...c, { kind: "problems", items: contextResolved.problems! }])
      setPendingKind(null)
    }
    if (pendingKind === "terminal" && contextResolved.terminal !== prev.terminal && contextResolved.terminal != null) {
      setChips((c) => [...c, { kind: "terminal", text: contextResolved.terminal! }])
      setPendingKind(null)
    }
  }, [contextResolved, pendingKind])

  const handleMentionSelect = useCallback(
    (kind: "selection" | "problems" | "terminal" | "file" | "workspace") => {
      setShowMenu(false)
      setMenuQuery("")
      setText((t) => {
        const at = t.lastIndexOf("@")
        return at >= 0 ? t.slice(0, at) : t
      })

      if (kind === "selection" || kind === "problems" || kind === "terminal") {
        setPendingKind(kind)
        post({ type: "mention.resolve", kind })
      } else if (kind === "file") {
        post({ type: "files.search", query: "" })
      } else if (kind === "workspace") {
        post({ type: "symbols.search", query: "" })
      }
      textareaRef.current?.focus()
    },
    [post],
  )

  const handleCommandSelect = useCallback(
    (command: string) => {
      setShowCommandMenu(false)
      setCommandQuery("")
      // Ensure command starts with '/'
      const commandWithSlash = command.startsWith('/') ? command : '/' + command
      setText(commandWithSlash + " ")
      textareaRef.current?.focus()
    },
    [],
  )

  const removeChip = useCallback((idx: number) => {
    setChips((c) => [...c.slice(0, idx), ...c.slice(idx + 1)])
  }, [])

  const buildPromptParts = useCallback((): PromptPart[] => {
    const parts: PromptPart[] = []

    for (const chip of chips) {
      if (chip.kind === "selection") {
        const { file, range, text: selText } = chip.context
        parts.push({ type: "text", text: `Code from ${file}:\n\`\`\`\n${selText}\n\`\`\`` })
      } else if (chip.kind === "problems") {
        const problems = chip.items.map((p) => `${p.severity}: ${p.file}:${p.line}`).join("\n")
        parts.push({ type: "text", text: `Workspace problems:\n${problems}` })
      } else if (chip.kind === "terminal") {
        parts.push({ type: "text", text: `Terminal output:\n\`\`\`\n${chip.text}\n\`\`\`` })
      }
    }

    if (text.trim()) {
      parts.push({ type: "text", text: text.trim() })
    }

    return parts
  }, [chips, text])

  const submit = useCallback(() => {
    if (!sessionID) return
    const parts = buildPromptParts()
    if (parts.length === 0) return
    post({ type: "prompt", sessionID, parts })
    setText("")
    setChips([])
  }, [sessionID, buildPromptParts, post])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showCommandMenu) {
        if (e.key === "ArrowDown") {
          e.preventDefault()
          setCommandActiveIdx((i) => i + 1)
          return
        }
        if (e.key === "ArrowUp") {
          e.preventDefault()
          setCommandActiveIdx((i) => Math.max(0, i - 1))
          return
        }
        if (e.key === "Escape") {
          e.preventDefault()
          setShowCommandMenu(false)
          return
        }
        if (e.key === "Enter") {
          e.preventDefault()
          const filtered = commands.filter(
            (cmd) =>
              !commandQuery ||
              cmd.name.toLowerCase().includes(commandQuery.toLowerCase()) ||
              (cmd.description?.toLowerCase() ?? "").includes(commandQuery.toLowerCase()),
          )
          if (filtered.length > 0 && commandActiveIdx < filtered.length) {
            handleCommandSelect(filtered[commandActiveIdx].name)
          }
          return
        }
      }
      if (showMenu) {
        if (e.key === "ArrowDown") {
          e.preventDefault()
          setMenuActiveIdx((i) => i + 1)
          return
        }
        if (e.key === "ArrowUp") {
          e.preventDefault()
          setMenuActiveIdx((i) => Math.max(0, i - 1))
          return
        }
        if (e.key === "Escape") {
          e.preventDefault()
          setShowMenu(false)
          return
        }
        if (e.key === "Enter") {
          e.preventDefault()
          const opts = ["selection", "problems", "terminal", "file", "workspace"] as const
          handleMentionSelect(opts[menuActiveIdx] ?? "selection")
          return
        }
      }
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault()
        submit()
      }
    },
    [showMenu, showCommandMenu, menuActiveIdx, commandActiveIdx, commandQuery, commands, handleMentionSelect, handleCommandSelect, submit],
  )

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setText(val)

    // Check if starts with '/' (for slash commands)
    if (val.startsWith('/')) {
      const query = val.slice(1)
      if (!query.includes(' ')) {
        setCommandQuery(query)
        setCommandActiveIdx(0)
        setShowCommandMenu(true)
        setShowMenu(false)
        return
      }
    }

    // Check for @ mentions
    const atIdx = val.lastIndexOf('@')
    if (atIdx >= 0) {
      const query = val.slice(atIdx + 1)
      if (!query.includes(' ')) {
        setMenuQuery(query)
        setMenuActiveIdx(0)
        setShowMenu(true)
        setShowCommandMenu(false)
        return
      }
    }
    
    setShowMenu(false)
    setShowCommandMenu(false)
  }, [])

  const canSubmit = !disabled && sessionID && (text.trim() || chips.length > 0)

  return (
    <div className="input-wrapper">
      {/* Menus must be inside input-wrapper for absolute positioning to work */}
      {showMenu && (
        <MentionMenu
          query={menuQuery}
          activeIdx={menuActiveIdx}
          onSelect={handleMentionSelect}
          onClose={() => setShowMenu(false)}
          post={post}
        />
      )}
      {showCommandMenu && (
        <CommandMenu
          commands={commands}
          query={commandQuery}
          activeIdx={commandActiveIdx}
          onSelect={handleCommandSelect}
          onClose={() => setShowCommandMenu(false)}
        />
      )}

      <textarea
        ref={textareaRef}
        className="input-textarea"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={sessionID ? "Ask opencode... (/ commands · @ files · ⌘K code)" : "Create a new chat to start"}
        disabled={disabled || !sessionID}
        rows={1}
      />

      <div className="input-toolbar">
        <div className="input-left">
          <button className="btn-tool" title="Add context" disabled={!sessionID} onClick={() => setShowMenu(true)}>
            @
          </button>
          <button
            className="btn-tool"
            title="Add code"
            disabled={!sessionID}
            onClick={() => post({ type: "mention.resolve", kind: "selection" })}
          >
            ⌘
          </button>
        </div>

        <div className="input-right">
          {chips.length > 0 && (
            <div className="context-badge">
              {chips.length} context
              <button
                onClick={() => setChips([])}
                style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}
              >
                ×
              </button>
            </div>
          )}
          <button className="btn-send" disabled={!canSubmit} onClick={submit} title="Send">
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
