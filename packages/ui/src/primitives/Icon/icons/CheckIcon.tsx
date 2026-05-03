import React from "react"
import { Icon, IconProps } from "../Icon"

export const CheckIcon: React.FC<IconProps> = ({ size = 16, className = "" }) => (
  <Icon size={size} className={className}>
    <polyline points="20 6 9 17 4 12" />
  </Icon>
)

export default CheckIcon
