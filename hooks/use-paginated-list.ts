"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { PaginatedResponse, PaginationParams } from "@/lib/types"

interface UsePaginatedListReturn<T> {
  items: T[]
  setItems: React.Dispatch<React.SetStateAction<T[]>>
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => void
  reset: () => void
  sentinelRef: (node: HTMLElement | null) => void
}

export function usePaginatedList<T>(
  fetcher: (params: PaginationParams, signal?: AbortSignal) => Promise<PaginatedResponse<T>>,
  deps: unknown[],
  errorMessage = "Something went wrong",
): UsePaginatedListReturn<T> {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  const cursorRef = useRef<string | undefined>(undefined)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelNodeRef = useRef<HTMLElement | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  // Fetch first page (AbortController cancels duplicate request in React Strict Mode)
  useEffect(() => {
    const controller = new AbortController()

    async function fetchFirstPage() {
      setLoading(true)
      setError(null)
      cursorRef.current = undefined
      try {
        const result = await fetcherRef.current({}, controller.signal)
        setItems(result.data)
        cursorRef.current = result.links.next ? result.meta.cursor : undefined
        setHasMore(!!result.links.next)
      } catch (e) {
        if (controller.signal.aborted) return
        setError(e instanceof Error ? e.message : errorMessage)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    fetchFirstPage()

    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, resetKey])

  // Load next page
  const loadMore = useCallback(async () => {
    if (!cursorRef.current || loadingMore) return
    setLoadingMore(true)
    try {
      const result = await fetcherRef.current({ cursor: cursorRef.current })
      setItems((prev) => [...prev, ...result.data])
      cursorRef.current = result.links.next ? result.meta.cursor : undefined
      setHasMore(!!result.links.next)
    } catch {
      // Silently fail on load-more — user can scroll again to retry
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore])

  // Reset: clear and refetch first page
  const reset = useCallback(() => {
    setItems([])
    setHasMore(false)
    cursorRef.current = undefined
    setResetKey((k) => k + 1)
  }, [])

  // IntersectionObserver sentinel ref callback
  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      // Disconnect previous observer
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }

      sentinelNodeRef.current = node
      if (!node) return

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            loadMore()
          }
        },
        { rootMargin: "200px" },
      )
      observerRef.current.observe(node)
    },
    [loadMore],
  )

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  return {
    items,
    setItems,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    reset,
    sentinelRef,
  }
}
