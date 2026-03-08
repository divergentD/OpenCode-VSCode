import React, { useState } from "react"
import type { QuestionRequest, WebviewMessage } from "../types"

type Props = {
  request: QuestionRequest
  post: (msg: WebviewMessage) => void
}

export function QuestionDialog({ request, post }: Props) {
  const [answered, setAnswered] = useState(false)
  const [freeText, setFreeText] = useState("")

  function answer(value: string) {
    setAnswered(true)
    post({ type: "question.reply", requestID: request.requestID, answers: [[value]] })
  }

  function reject() {
    setAnswered(true)
    post({ type: "question.reject", requestID: request.requestID })
  }

  return (
    <div
      className="question-dialog"
      style={{ opacity: answered ? 0.5 : 1, pointerEvents: answered ? "none" : undefined }}
    >
      <div className="dialog-label">
        <span>?</span>
        <span>{request.question}</span>
      </div>

      {!answered && (
        <>
          {request.options && request.options.length > 0 ? (
            <div className="dialog-actions">
              {request.options.map((opt, i) => (
                <button key={i} onClick={() => answer(opt)}>
                  {opt}
                </button>
              ))}
              <button className="btn-secondary" onClick={reject}>
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
              <input
                type="text"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && freeText.trim()) answer(freeText.trim())
                }}
                placeholder="Type your answer…"
                style={{
                  flex: 1,
                  background: "var(--vscode-input-background)",
                  color: "var(--vscode-input-foreground)",
                  border: "1px solid var(--vscode-input-border, transparent)",
                  borderRadius: "2px",
                  padding: "4px 6px",
                  fontSize: "12px",
                  fontFamily: "inherit",
                  outline: "none",
                }}
                autoFocus
              />
              <button disabled={!freeText.trim()} onClick={() => answer(freeText.trim())}>
                OK
              </button>
              <button className="btn-secondary" onClick={reject}>
                Cancel
              </button>
            </div>
          )}
        </>
      )}

      {answered && <div style={{ fontSize: "11px", opacity: 0.6 }}>Answered</div>}
    </div>
  )
}
