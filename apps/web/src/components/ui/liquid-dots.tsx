import { useId } from "react"

import { cn } from "@/lib/utils/cn"

const sizeClasses = {
  sm: "h-3.5 w-7",
  md: "h-5 w-10",
  lg: "h-10 w-20",
} as const

interface LiquidDotsProps {
  size?: keyof typeof sizeClasses
  className?: string
}

// Each instance needs its own filter id; shared ids break the effect in Safari.
export function LiquidDots({ size = "md", className }: LiquidDotsProps) {
  const filterId = useId().replace(/[^a-zA-Z0-9_-]/g, "")

  return (
    <svg
      data-slot="liquid-dots"
      viewBox="0 0 64 32"
      className={cn(sizeClasses[size], className)}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter
          id={filterId}
          filterUnits="userSpaceOnUse"
          x="-16"
          y="-16"
          width="96"
          height="64"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            result="goo"
          />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
      </defs>
      <g filter={`url(#${filterId})`} fill="currentColor">
        <circle className="liquid-dot-left" cx="32" cy="16" r="12" />
        <circle className="liquid-dot-right" cx="32" cy="16" r="12" />
      </g>
    </svg>
  )
}
