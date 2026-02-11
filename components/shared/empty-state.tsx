import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: LucideIcon
  message: string
  variant?: "default" | "error"
  className?: string
  children?: React.ReactNode
}

export function EmptyState({
  icon: Icon,
  message,
  variant = "default",
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20",
        variant === "error"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-border/50 bg-muted/20 text-muted-foreground",
        className
      )}
    >
      <Icon
        className={cn(
          "mb-4 size-12",
          variant === "error"
            ? "text-destructive/30"
            : "text-muted-foreground/30"
        )}
      />
      <p className="text-base font-medium">{message}</p>
      {children}
    </div>
  )
}
