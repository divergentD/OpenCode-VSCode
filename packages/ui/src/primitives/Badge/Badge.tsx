import React from "react"

export interface BadgeProps {
  variant: "addition" | "deletion" | "modification" | "neutral"
  count: number
  showZero?: boolean
}

const variantColors: Record<BadgeProps["variant"], string> = {
  addition: "var(--vscode-gitDecoration-addedResourceForeground)",
  deletion: "var(--vscode-gitDecoration-deletedResourceForeground)",
  modification: "var(--vscode-textLink-foreground)",
  neutral: "var(--vscode-descriptionForeground)",
}

export function Badge({ variant, count, showZero = false }: BadgeProps) {
  if (count === 0 && !showZero) {
    return null
  }

  const color = variantColors[variant]

  return (
    <span
      className="opencode-badge"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "18px",
        height: "18px",
        padding: "0 6px",
        borderRadius: "9px",
        fontSize: "11px",
        fontWeight: 600,
        lineHeight: 1,
        color: "var(--vscode-badge-foreground)",
        backgroundColor: color,
      }}
    >
      {count}
    </span>
  )
}
