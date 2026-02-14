"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { GitMerge, Loader2, Pin, Plus, RefreshCw, Search, ShoppingCart, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ShoppingListCard } from "@/components/shopping-list/shopping-list-card"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Link, useRouter, usePathname } from "@/i18n/navigation"
import {
  getShoppingLists,
  getSpaces,
  updateShoppingList,
  combineShoppingLists,
  ConflictError,
} from "@/lib/api"
import {
  type ShoppingListResponse,
  type SpaceResponse,
} from "@/lib/types"
import { usePaginatedList } from "@/hooks/use-paginated-list"


function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

export function ShoppingListIndex() {
  const t = useTranslations("ShoppingList")
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const [spaces, setSpaces] = useState<SpaceResponse[]>([])
  const searchParams = useSearchParams()
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(
    searchParams.get("spaceId")
  )
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(null)

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(value.trim())
    }, 400)
  }, [])

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [])

  const [combineMode, setCombineMode] = useState(false)
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set())
  const [combineName, setCombineName] = useState("")
  const [combining, setCombining] = useState(false)
  const [combineError, setCombineError] = useState<string | null>(null)

  const spaceId = activeSpaceId ?? undefined

  const {
    items: lists,
    setItems: setLists,
    loading,
    loadingMore,
    error: loadError,
    hasMore,
    reset: resetLists,
    sentinelRef,
  } = usePaginatedList<ShoppingListResponse>(
    (params, signal) => getShoppingLists(searchQuery ? { ...params, search: searchQuery } : params, spaceId, signal),
    [spaceId, searchQuery],
    t("loadError"),
  )

  // Fetch spaces for tabs
  useEffect(() => {
    getSpaces({ limit: 100 }).then((res) => setSpaces(res.data)).catch(() => {})
  }, [])

  function handleConflict(e: unknown): boolean {
    if (e instanceof ConflictError) {
      toast.error(t("conflictError"))
      resetLists()
      return true
    }
    return false
  }

  // --- Toggle pin ---
  async function handleTogglePin(listId: string) {
    const list = lists.find((l) => l.id === listId)
    if (!list) return
    const newPinned = !list.isPinned

    setLists((prev) =>
      prev.map((l) => (l.id === listId ? { ...l, isPinned: newPinned } : l))
    )

    try {
      const updated = await updateShoppingList(listId, { isPinned: newPinned, version: list.version }, spaceId)
      setLists((prev) => prev.map((l) => (l.id === listId ? updated : l)))
    } catch (e) {
      if (handleConflict(e)) return
      setLists((prev) =>
        prev.map((l) => (l.id === listId ? { ...l, isPinned: !newPinned } : l))
      )
    }
  }

  // --- Combine mode ---
  function toggleSelectList(listId: string) {
    setSelectedListIds((prev) => {
      const next = new Set(prev)
      if (next.has(listId)) {
        next.delete(listId)
      } else {
        next.add(listId)
      }
      return next
    })
  }

  function exitCombineMode() {
    setCombineMode(false)
    setSelectedListIds(new Set())
    setCombineName("")
    setCombineError(null)
  }

  async function handleCombine() {
    if (selectedListIds.size < 2) return
    setCombining(true)
    setCombineError(null)
    try {
      const newList = await combineShoppingLists({
        listIds: Array.from(selectedListIds),
        ...(combineName.trim() && { name: combineName.trim() }),
      }, spaceId)
      setLists((prev) => [newList, ...prev])
      exitCombineMode()
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("combineError")
      setCombineError(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setCombining(false)
    }
  }

  // --- Space tab switch ---
  function handleSpaceSwitch(newSpaceId: string | null) {
    if (newSpaceId === activeSpaceId) return
    setActiveSpaceId(newSpaceId)
    setSearchInput("")
    setSearchQuery("")
    exitCombineMode()
    const url = newSpaceId
      ? `${pathname}?spaceId=${newSpaceId}`
      : pathname
    router.replace(url, { scroll: false })
  }

  const createHref = activeSpaceId
    ? `/shopping-list/new?spaceId=${activeSpaceId}`
    : "/shopping-list/new"

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader title={t("heading")} subtitle={t("subtitle")} />

      {/* Space context tabs */}
      {spaces.length > 0 && (
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-border/60 bg-muted/30 p-1">
          <button
            onClick={() => handleSpaceSwitch(null)}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              activeSpaceId === null
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("myLists")}
          </button>
          {spaces.map((space) => (
            <button
              key={space.id}
              onClick={() => handleSpaceSwitch(space.id)}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeSpaceId === space.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {space.name}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="pl-9"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => { setSearchInput(""); setSearchQuery("") }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="mb-6 flex justify-end gap-2">
        {combineMode ? (
          <Button variant="outline" onClick={exitCombineMode}>
            <X className="size-4" />
            {t("combineCancel")}
          </Button>
        ) : (
          <>
            {lists.length >= 2 && (
              <Button
                variant="outline"
                onClick={() => setCombineMode(true)}
              >
                <GitMerge className="size-4" />
                {t("combineButton")}
              </Button>
            )}
            <Button asChild className="border-0">
              <Link href={createHref}>
                <Plus />
                {t("createListButton")}
              </Link>
            </Button>
          </>
        )}
      </div>

      <div className="space-y-4">
        {loading && (
          <EmptyState icon={Loader2} message={t("loading")} className="[&_svg]:animate-spin" />
        )}

        {loadError && (
          <EmptyState icon={RefreshCw} message={t("loadError")} variant="error">
            <Button variant="outline" onClick={resetLists} className="mt-4">
              <RefreshCw className="size-4" />
              {t("retry")}
            </Button>
          </EmptyState>
        )}

        {!loading && !loadError && lists.length === 0 && (
          <EmptyState
            icon={searchQuery ? Search : ShoppingCart}
            message={searchQuery ? t("noSearchResults") : t("emptyLists")}
          />
        )}

        {(() => {
          const sorted = [...lists].sort((a, b) => Number(b.isPinned) - Number(a.isPinned))
          const pinnedLists = sorted.filter((l) => l.isPinned)
          const unpinnedLists = sorted.filter((l) => !l.isPinned)

          function renderCard(list: ShoppingListResponse) {
            const checkedCount = list.items.filter((i) => i.purchased).length
            return (
              <ShoppingListCard
                key={list.id}
                title={list.name}
                description={t("purchased", {
                  checked: checkedCount,
                  total: list.items.length,
                })}
                items={[]}
                onToggleItem={() => {}}
                createdAt={t("createdAt", { date: formatDate(list.createdAt, locale) })}
                label={list.label}
                isPinned={list.isPinned}
                onTogglePin={combineMode ? undefined : () => handleTogglePin(list.id)}
                pinLabel={t("pin")}
                selectable={combineMode}
                selected={selectedListIds.has(list.id)}
                onSelect={() => toggleSelectList(list.id)}
                onOpen={combineMode ? undefined : () => router.push(activeSpaceId ? `/shopping-list/${list.id}?spaceId=${activeSpaceId}` : `/shopping-list/${list.id}`)}
              />
            )
          }

          return (
            <>
              {pinnedLists.length > 0 && (
                <>
                  <div className="flex items-center gap-2 text-xs font-medium text-primary/70">
                    <Pin className="size-3 fill-current" />
                    {t("pinnedSection")}
                  </div>
                  {pinnedLists.map(renderCard)}
                  {unpinnedLists.length > 0 && (
                    <div className="flex items-center gap-3 py-1">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs text-muted-foreground">{t("otherSection")}</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}
                </>
              )}
              {unpinnedLists.map(renderCard)}
            </>
          )
        })()}

        {/* Infinite scroll sentinel */}
        {hasMore && <div ref={sentinelRef} />}
        {loadingMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {combineMode && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-4 shadow-lg">
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            {combineError && (
              <p className="text-sm text-destructive">{combineError}</p>
            )}
            <div className="flex items-center gap-2">
              <Input
                value={combineName}
                onChange={(e) => setCombineName(e.target.value)}
                placeholder={t("combineNamePlaceholder")}
                maxLength={200}
                className="flex-1"
              />
              <Button
                onClick={handleCombine}
                disabled={selectedListIds.size < 2 || combining}
                className="shrink-0 shadow-md"
              >
                {combining && <Loader2 className="size-4 animate-spin" />}
                {combining
                  ? t("combining")
                  : t("combineSelected", { count: selectedListIds.size })}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
