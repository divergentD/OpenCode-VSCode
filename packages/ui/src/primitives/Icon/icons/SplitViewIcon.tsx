import React from "react"
import { Icon, IconProps } from "../Icon"

export const SplitViewIcon: React.FC<IconProps> = ({ size = 16, className = "" }) => (
  <Icon size={size} className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="12" y1="3" x2="12" y2="21" />
  </Icon>
)

export default SplitViewIcon
