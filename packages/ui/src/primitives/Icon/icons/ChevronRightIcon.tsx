import React from "react"
import { Icon, IconProps } from "../Icon"

export const ChevronRightIcon: React.FC<IconProps> = ({ size = 16, className = "" }) => (
  <Icon size={size} className={className}>
    <polyline points="9 18 15 12 9 6" />
  </Icon>
)

export default ChevronRightIcon
