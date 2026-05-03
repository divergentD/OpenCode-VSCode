import React from "react"

export interface IconProps {
  size?: number
  className?: string
  strokeWidth?: number
}

export const Icon: React.FC<
  IconProps & {
    children: React.ReactNode
    viewBox?: string
  }
> = ({
  size = 16,
  className = "",
  strokeWidth = 2,
  children,
  viewBox = "0 0 24 24",
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  )
}

export default Icon
