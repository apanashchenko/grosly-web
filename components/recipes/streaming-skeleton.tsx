"use client"

import { useEffect, useRef, useMemo } from "react"
import { Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Props {
  message: string
  text: string
}

/**
 * Extract human-readable fragments from partial JSON stream.
 * Finds completed "key":"value" pairs for readable keys,
 * plus a trailing incomplete string if the stream is mid-value.
 */
function extractReadableText(raw: string): string {
  const lines: string[] = []

  // Match completed "key":"value" pairs for readable fields
  const completedPairs = [
    ...raw.matchAll(/"(dishName|description|name|text)"\s*:\s*"((?:[^"\\]|\\.)*)"/g),
  ]

  // Match completed "cookingTime": number
  const cookingTimes = [
    ...raw.matchAll(/"cookingTime"\s*:\s*(\d+)/g),
  ]

  // Match completed "step": number (to prefix instructions)
  const steps = [
    ...raw.matchAll(/"step"\s*:\s*(\d+)/g),
  ]

  let currentDish = ""
  const stepSet = new Set(steps.map((m) => m.index))

  for (const match of completedPairs) {
    const key = match[1]
    const value = match[2].replace(/\\"/g, '"').replace(/\\n/g, "\n")

    switch (key) {
      case "dishName":
        if (lines.length > 0) lines.push("")
        currentDish = value
        lines.push(`${value}`)
        break
      case "description":
        if (value) lines.push(value)
        break
      case "name":
        lines.push(`  • ${value}`)
        break
      case "text": {
        // Find the step number preceding this text
        const matchPos = match.index ?? 0
        let stepNum = ""
        for (const s of steps) {
          if ((s.index ?? 0) < matchPos) stepNum = s[1]
        }
        lines.push(`  ${stepNum ? stepNum + ". " : ""}${value}`)
        break
      }
    }
  }

  // Check for cooking time after last dish
  for (const ct of cookingTimes) {
    lines.push(`  ⏱ ${ct[1]} хв`)
  }

  // Check if there's an incomplete string being typed right now
  // Find the last unmatched opening quote after a colon
  const lastColonQuote = raw.lastIndexOf(':"')
  if (lastColonQuote !== -1) {
    const afterQuote = raw.slice(lastColonQuote + 2)
    // If no closing quote found, this string is still being typed
    if (!afterQuote.includes('"')) {
      const partial = afterQuote.replace(/\\"/g, '"').replace(/\\n/g, "\n")
      if (partial.length > 0) {
        lines.push(`  ${partial}`)
      }
    }
  }

  return lines.join("\n")
}

export function StreamingPreview({ message, text }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  const readableText = useMemo(() => extractReadableText(text), [text])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [readableText])

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Sparkles className="size-4 animate-pulse text-primary" />
          <span className="animate-pulse">{message}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          className="max-h-80 overflow-y-auto rounded-md bg-muted/30 p-4 text-sm leading-relaxed text-foreground"
        >
          {readableText ? (
            <pre className="whitespace-pre-wrap break-words font-sans">
              {readableText}
              <span className="inline-block h-4 w-1.5 animate-pulse bg-primary/60" />
            </pre>
          ) : (
            <span className="text-muted-foreground animate-pulse">...</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
