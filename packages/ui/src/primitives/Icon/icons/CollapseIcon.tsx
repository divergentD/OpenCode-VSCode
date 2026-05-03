import React from "react"
import { Icon, IconProps } from "../Icon"

export const CollapseIcon: React.FC<IconProps> = ({ size = 16, className = "" }) => (
  <Icon size={size} className={className}>
    <polyline points="6 15 12 9 18 15" />
    <line x1="12" y1="9" x2="12" y2="21" />
  </Icon>
)

export default CollapseIcon
