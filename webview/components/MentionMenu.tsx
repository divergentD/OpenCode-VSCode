import React, { useEffect, useRef } from "react"
import type { WebviewMessage } from "../types"

type MentionOption = {
  kind: "selection" | "problems" | "terminal" | "file" | "workspace"
  icon: string
  label: string
  desc: string
}

const STATIC_OPTIONS: MentionOption[] = [
  { kind: "selection", icon: "⌗", label: "@selection", desc: "Current selection" },
  { kind: "problems", icon: "⚠", label: "@problems", desc: "Workspace errors" },
  { kind: "terminal", icon: ">_", label: "@terminal", desc: "Terminal output" },
  { kind: "file", icon: "📄", label: "@file", desc: "File contents" },
  { kind: "workspace", icon: "🔍", label: "@workspace", desc: "Symbol search" },
]

type Props = {
  query: string
  activeIdx: number
  onSelect: (kind: MentionOption["kind"]) => void
  onClose: () => void
  post: (msg: WebviewMessage) => void
}

export function MentionMenu({ query, activeIdx, onSelect, onClose, post }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)

  const filtered = STATIC_OPTIONS.filter(
    (o) => !query || o.label.toLowerCase().includes(query.toLowerCase()) || o.kind.includes(query.toLowerCase()),
  )

  useEffect(() => {
    const el = menuRef.current?.querySelectorAll(".mention-menu-item")[activeIdx] as HTMLElement
    el?.scrollIntoView({ block: "nearest" })
  }, [activeIdx])

  if (filtered.length === 0) return null

  return (
    <div className="mention-menu" ref={menuRef}>
      {filtered.map((opt, i) => (
        <div
          key={opt.kind}
          className={`mention-menu-item${i === activeIdx ? " active" : ""}`}
          onMouseDown={(e) => {
            e.preventDefault()
            onSelect(opt.kind)
          }}
        >
          <span className="icon">{opt.icon}</span>
          <span className="label">{opt.label}</span>
          <span className="desc">{opt.desc}</span>
        </div>
      ))}
    </div>
  )
}
