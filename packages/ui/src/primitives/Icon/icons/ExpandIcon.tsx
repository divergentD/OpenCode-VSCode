import React from "react"
import { Icon, IconProps } from "../Icon"

export const ExpandIcon: React.FC<IconProps> = ({ size = 16, className = "" }) => (
  <Icon size={size} className={className}>
    <polyline points="6 9 12 15 18 9" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </Icon>
)

export default ExpandIcon
