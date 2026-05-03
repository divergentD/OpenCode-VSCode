import React from "react"
import "./Button.css"

export interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "icon"
  size?: "sm" | "md" | "lg"
  children: React.ReactNode
  onClick?: () => void
  title?: string
  disabled?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  children,
  onClick,
  title,
  disabled = false,
}) => {
  const className = [
    "opencode-button",
    `opencode-button--${variant}`,
    `opencode-button--${size}`,
  ].join(" ")

  return (
    <button
      className={className}
      onClick={onClick}
      title={title}
      disabled={disabled}
      type="button"
    >
      {children}
    </button>
  )
}
