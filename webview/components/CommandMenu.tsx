import React, { useEffect, useRef } from "react"
import type { CommandInfo } from "../types"

type Props = {
  commands: CommandInfo[]
  query: string
  activeIdx: number
  onSelect: (command: string) => void
  onClose: () => void
}

export function CommandMenu({ commands, query, activeIdx, onSelect, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)

  console.log('[CommandMenu] Rendering - commands.length:', commands.length, 'query:', query, 'activeIdx:', activeIdx)

  const filtered = commands.filter(
    (cmd) =>
      !query ||
      cmd.name.toLowerCase().includes(query.toLowerCase()) ||
      (cmd.description?.toLowerCase() ?? "").includes(query.toLowerCase()),
  )

  console.log('[CommandMenu] Filtered commands:', filtered.length)

  useEffect(() => {
    const el = menuRef.current?.querySelectorAll(".command-menu-item")[activeIdx] as HTMLElement
    el?.scrollIntoView({ block: "nearest" })
  }, [activeIdx])

  if (filtered.length === 0) return null

  return (
    <div className="command-menu" ref={menuRef}>
      {filtered.map((cmd, i) => (
        <div
          key={cmd.name || `${cmd.id}-${i}`}
          className={`command-menu-item${i === activeIdx ? " active" : ""}`}
          onMouseDown={(e) => {
            e.preventDefault()
            onSelect(cmd.name)
          }}
        >
          <span className="command-name">/{cmd.name}</span>
          <span className="command-desc">{cmd.description || ""}</span>
        </div>
      ))}
    </div>
  )
}
