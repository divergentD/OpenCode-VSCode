import React from "react"
import { Icon, IconProps } from "../Icon"

export const ShowDiffIcon: React.FC<IconProps> = ({ size = 16, className = "" }) => (
  <Icon size={size} className={className}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="8" y1="11" x2="14" y2="11" />
    <line x1="11" y1="8" x2="11" y2="14" />
  </Icon>
)

export default ShowDiffIcon
