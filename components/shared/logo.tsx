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
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2d9e46" />
            <stop offset="100%" stopColor="#7cc68a" />
          </linearGradient>
        </defs>
        {/* Cart basket */}
        <rect x="6" y="12" width="20" height="13" rx="3" fill="url(#logo-grad)" />
        {/* Cart wheels */}
        <circle cx="11" cy="27.5" r="1.8" fill="url(#logo-grad)" />
        <circle cx="22" cy="27.5" r="1.8" fill="url(#logo-grad)" />
        {/* Cart handle */}
        <path
          d="M3 3h3.5l2 9h15.5"
          stroke="url(#logo-grad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Leaf on cart */}
        <path
          d="M14 16c0-2.5 2.5-4.5 5.5-4.5-.8 1.8-2 3-3.5 4 0 0 1.3-.4 2.5-1.7-.4 1.8-2 3.5-4.5 4V16z"
          fill="white"
          opacity="0.9"
        />
      </svg>
    </span>
  )
}
