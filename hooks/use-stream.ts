import { useRef, useState, useCallback } from "react"

type StreamFn<T> = (
  callbacks: {
    onPartial?: (partial: Partial<T>) => void
    onDone: (data: T) => void
    onError: (error: Error) => void
  },
  signal?: AbortSignal,
) => Promise<void>

type FallbackFn<T> = () => Promise<T>

interface UseStreamReturn<T> {
  isStreaming: boolean
  isLoading: boolean
  partial: Partial<T> | null
  result: T | null
  error: string | null
  start: (streamFn: StreamFn<T>, fallbackFn?: FallbackFn<T>) => void
  abort: () => void
}

export function useStream<T>(): UseStreamReturn<T> {
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [partial, setPartial] = useState<Partial<T> | null>(null)
  const [result, setResult] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const abort = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const start = useCallback(
    (streamFn: StreamFn<T>, fallbackFn?: FallbackFn<T>) => {
      abort()

      const controller = new AbortController()
      abortRef.current = controller

      setIsStreaming(true)
      setIsLoading(true)
      setPartial(null)
      setResult(null)
      setError(null)

      streamFn(
        {
          onPartial: (data) => {
            if (controller.signal.aborted) return
            setPartial(data)
          },
          onDone: (data) => {
            if (controller.signal.aborted) return
            setResult(data)
            setPartial(null)
            setIsStreaming(false)
            setIsLoading(false)
          },
          onError: async (err) => {
            if (controller.signal.aborted) return

            if (fallbackFn) {
              try {
                const data = await fallbackFn()
                if (controller.signal.aborted) return
                setResult(data)
                setPartial(null)
                setIsStreaming(false)
                setIsLoading(false)
                return
              } catch (fallbackErr) {
                if (controller.signal.aborted) return
                setError(
                  fallbackErr instanceof Error
                    ? fallbackErr.message
                    : "Something went wrong.",
                )
              }
            } else {
              setError(err.message)
            }

            setPartial(null)
            setIsStreaming(false)
            setIsLoading(false)
          },
        },
        controller.signal,
      )
    },
    [abort],
  )

  return { isStreaming, isLoading, partial, result, error, start, abort }
}
