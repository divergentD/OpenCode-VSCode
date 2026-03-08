import React, { useState } from "react"
import type { PermissionRequest, WebviewMessage } from "../types"

type Props = {
  request: PermissionRequest
  post: (msg: WebviewMessage) => void
}

const PERMISSION_ICONS: Record<string, string> = {
  bash: ">_",
  write: "✎",
  read: "📖",
  network: "🌐",
  question: "?",
}

const PERMISSION_LABELS: Record<string, string> = {
  bash: "Run command",
  write: "Write file",
  read: "Read file",
  network: "Network request",
}

export function PermissionDialog({ request, post }: Props) {
  const [replied, setReplied] = useState(false)

  function reply(r: "once" | "always" | "reject") {
    setReplied(true)
    post({ type: "permission.reply", requestID: request.requestID, reply: r })
  }

  const icon = PERMISSION_ICONS[request.type] ?? "⚠"
  const label = PERMISSION_LABELS[request.type] ?? request.type
  const detail = request.command ?? request.path ?? request.description

  return (
    <div
      className="permission-dialog"
      style={{ opacity: replied ? 0.5 : 1, pointerEvents: replied ? "none" : undefined }}
    >
      <div className="dialog-label">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      {detail && <div className="dialog-desc">{detail}</div>}
      {!replied && (
        <div className="dialog-actions">
          <button onClick={() => reply("once")}>Allow Once</button>
          <button onClick={() => reply("always")}>Always Allow</button>
          <button className="btn-danger" onClick={() => reply("reject")}>
            Deny
          </button>
        </div>
      )}
      {replied && <div style={{ fontSize: "11px", opacity: 0.6 }}>Replied</div>}
    </div>
  )
}
