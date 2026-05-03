import React from "react"
import { Icon, IconProps } from "../Icon"

export const UnifiedViewIcon: React.FC<IconProps> = ({ size = 16, className = "" }) => (
  <Icon size={size} className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="3" y1="12" x2="21" y2="12" />
  </Icon>
)

export default UnifiedViewIcon
