import React from "react"
import { Icon, IconProps } from "../Icon"

export const OpenFileIcon: React.FC<IconProps> = ({ size = 16, className = "" }) => (
  <Icon size={size} className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <polyline points="10 13 12 11 14 13" />
    <line x1="12" y1="11" x2="12" y2="17" />
  </Icon>
)

export default OpenFileIcon
