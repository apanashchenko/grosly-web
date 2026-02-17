"use client"

import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  iconSize?: number
}

export function Logo({ className, iconSize = 24 }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Green leaf background */}
        <path
          d="M60 0C20 0 0 30 0 60c0 40 35 60 70 55 35-5 50-35 50-65C120 15 95 0 60 0z"
          fill="#4CAF50"
        />
        {/* White paper */}
        <path
          d="M45 25h40c10 0 15 5 15 15v45c0 10-5 15-15 15H45c-10 0-15-5-15-15V40c0-10 5-15 15-15z"
          fill="white"
        />
        {/* Paper lines */}
        <rect x="45" y="40" width="35" height="6" rx="3" fill="#4CAF50" />
        <rect x="45" y="55" width="25" height="6" rx="3" fill="#4CAF50" />
        {/* Orange checkmark */}
        <path
          d="M45 75l15 15 35-35"
          stroke="#F58220"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </span>
  )
}
