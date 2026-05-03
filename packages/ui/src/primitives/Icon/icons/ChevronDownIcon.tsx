import React from "react"
import { Icon, IconProps } from "../Icon"

export const ChevronDownIcon: React.FC<IconProps> = ({ size = 16, className = "" }) => (
  <Icon size={size} className={className}>
    <polyline points="6 9 12 15 18 9" />
  </Icon>
)

export default ChevronDownIcon
