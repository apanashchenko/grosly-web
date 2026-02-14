"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { arrayMove } from "@dnd-kit/sortable"
import { GitMerge, Loader2, Plus, RefreshCw, Search, Share2, ShoppingCart, User, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ShoppingListCard, type CategoryOption } from "@/components/shopping-list/shopping-list-card"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Link, useRouter, usePathname } from "@/i18n/navigation"
import {
  getShoppingLists,
  getCategories,
  getSpaces,
  createShoppingList,
  updateShoppingList,
  deleteShoppingList,
  addShoppingListItems,
  updateShoppingListItem,
  deleteShoppingListItem,
  smartGroupShoppingList,
  combineShoppingLists,
  ConflictError,
} from "@/lib/api"
import {
  UNITS,
  type Category,
  type ShoppingListResponse,
  type ShoppingListItemResponse,
  type SpaceResponse,
} from "@/lib/types"
import { useCategoryLocalization } from "@/hooks/use-category-localization"
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
  const { localizeCategoryName } = useCategoryLocalization()

  const router = useRouter()
  const pathname = usePathname()

  const [categories, setCategories] = useState<Category[]>([])
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

  const [smartGroupingListId, setSmartGroupingListId] = useState<string | null>(null)
  const [sharingListId, setSharingListId] = useState<string | null>(null)
  const [sharingLoading, setSharingLoading] = useState(false)
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

  // Fetch categories + spaces (non-paginated / high-limit for tabs)
  // Fetch categories + spaces (non-paginated / high-limit for tabs)
  useEffect(() => {
    Promise.all([
      getCategories().catch(() => [] as Category[]),
      getSpaces({ limit: 100 }).then((res) => res.data).catch(() => [] as SpaceResponse[]),
    ]).then(([categoriesData, spacesData]) => {
      setCategories(categoriesData)
      setSpaces(spacesData)
    })
  }, [])

  const categoryOptions: CategoryOption[] = categories.map((c) => ({
    value: c.id,
    label: localizeCategoryName(c),
    icon: c.icon,
  }))

  function formatQty(quantity: number, unit: string): string {
    const label = UNITS.includes(unit as (typeof UNITS)[number])
      ? t(`units.${unit}`)
      : unit
    return label ? `${quantity} ${label}` : `${quantity}`
  }

  function handleConflict(e: unknown): boolean {
    if (e instanceof ConflictError) {
      toast.error(t("conflictError"))
      resetLists()
      return true
    }
    return false
  }

  // --- Toggle purchased ---
  async function toggleItem(listId: string, index: number) {
    const list = lists.find((l) => l.id === listId)
    if (!list) return
    const item = list.items[index]
    if (!item) return

    const newPurchased = !item.purchased

    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? {
              ...l,
              items: l.items.map((it, i) =>
                i === index ? { ...it, purchased: newPurchased } : it
              ),
            }
          : l
      )
    )

    try {
      const updated = await updateShoppingListItem(listId, item.id, { purchased: newPurchased }, spaceId)
      setLists((prev) => prev.map((l) => (l.id === listId ? updated : l)))
    } catch (e) {
      if (handleConflict(e)) return
      setLists((prev) =>
        prev.map((l) =>
          l.id === listId
            ? {
                ...l,
                items: l.items.map((it, i) =>
                  i === index ? { ...it, purchased: !newPurchased } : it
                ),
              }
            : l
        )
      )
    }
  }

  // --- Reorder items ---
  async function reorderItems(listId: string, fromIndex: number, toIndex: number) {
    const list = lists.find((l) => l.id === listId)
    if (!list) return

    const reordered = arrayMove(list.items, fromIndex, toIndex)

    setLists((prev) =>
      prev.map((l) =>
        l.id === listId ? { ...l, items: reordered } : l
      )
    )

    try {
      const updated = await updateShoppingList(listId, {
        itemPositions: reordered.map((item, i) => ({ id: item.id, position: i })),
        version: list.version,
      }, spaceId)
      setLists((prev) => prev.map((l) => (l.id === listId ? updated : l)))
    } catch (e) {
      if (handleConflict(e)) return
      setLists((prev) =>
        prev.map((l) =>
          l.id === listId ? { ...l, items: list.items } : l
        )
      )
    }
  }

  // --- Edit list name ---
  async function handleEditListName(listId: string, newName: string) {
    const list = lists.find((l) => l.id === listId)
    if (!list) return
    const prevName = list.name

    setLists((prev) =>
      prev.map((l) => (l.id === listId ? { ...l, name: newName } : l))
    )

    try {
      const updated = await updateShoppingList(listId, { name: newName, version: list.version }, spaceId)
      setLists((prev) => prev.map((l) => (l.id === listId ? updated : l)))
    } catch (e) {
      if (handleConflict(e)) return
      setLists((prev) =>
        prev.map((l) => (l.id === listId ? { ...l, name: prevName } : l))
      )
    }
  }

  // --- Delete list ---
  async function removeList(listId: string) {
    const removed = lists.find((l) => l.id === listId)
    setLists((prev) => prev.filter((l) => l.id !== listId))

    try {
      await deleteShoppingList(listId, spaceId)
    } catch {
      if (removed) {
        setLists((prev) => [...prev, removed])
      }
    }
  }

  // --- Edit item ---
  async function handleEditItem(listId: string, index: number, data: { name: string; quantity: number; unit: string; categoryId?: string; note?: string }) {
    const list = lists.find((l) => l.id === listId)
    if (!list) return
    const item = list.items[index]
    if (!item) return

    const prevItem = { ...item }
    const newCategory = data.categoryId
      ? categories.find((c) => c.id === data.categoryId) ?? null
      : null

    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? {
              ...l,
              items: l.items.map((it, i) =>
                i === index
                  ? {
                      ...it,
                      name: data.name,
                      quantity: data.quantity,
                      unit: data.unit,
                      note: data.note ?? null,
                      category: newCategory
                        ? { id: newCategory.id, name: newCategory.name, icon: newCategory.icon }
                        : null,
                    }
                  : it
              ),
            }
          : l
      )
    )

    try {
      const updated = await updateShoppingListItem(listId, item.id, {
        name: data.name,
        quantity: data.quantity,
        unit: data.unit,
        categoryId: data.categoryId,
        note: data.note,
      }, spaceId)
      setLists((prev) => prev.map((l) => (l.id === listId ? updated : l)))
    } catch (e) {
      if (handleConflict(e)) return
      setLists((prev) =>
        prev.map((l) =>
          l.id === listId
            ? {
                ...l,
                items: l.items.map((it, i) =>
                  i === index ? prevItem : it
                ),
              }
            : l
        )
      )
    }
  }

  // --- Delete item ---
  async function handleDeleteItem(listId: string, index: number) {
    const list = lists.find((l) => l.id === listId)
    if (!list) return
    const item = list.items[index]
    if (!item) return

    const prevItems = [...list.items]

    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? { ...l, items: l.items.filter((_, i) => i !== index) }
          : l
      )
    )

    try {
      await deleteShoppingListItem(listId, item.id, spaceId)
    } catch (e) {
      if (handleConflict(e)) return
      setLists((prev) =>
        prev.map((l) =>
          l.id === listId ? { ...l, items: prevItems } : l
        )
      )
    }
  }

  // --- Toggle group by category ---
  async function toggleGrouped(listId: string) {
    const list = lists.find((l) => l.id === listId)
    if (!list) return
    const newValue = !list.groupedByCategories

    setLists((prev) =>
      prev.map((l) =>
        l.id === listId ? { ...l, groupedByCategories: newValue } : l
      )
    )

    try {
      const updated = await updateShoppingList(listId, { groupedByCategories: newValue, version: list.version }, spaceId)
      setLists((prev) => prev.map((l) => (l.id === listId ? updated : l)))
    } catch (e) {
      if (handleConflict(e)) return
      setLists((prev) =>
        prev.map((l) =>
          l.id === listId ? { ...l, groupedByCategories: !newValue } : l
        )
      )
    }
  }

  // --- Add item to existing list ---
  async function handleAddItem(listId: string, data: { name: string; quantity: number; unit: string; categoryId?: string; note?: string }) {
    const list = lists.find((l) => l.id === listId)
    if (!list) return

    const newPosition = list.items.length
    const tempId = `temp-${Date.now()}`

    const tempCategory = data.categoryId
      ? categories.find((c) => c.id === data.categoryId) ?? null
      : null

    const tempItem: ShoppingListItemResponse = {
      id: tempId,
      name: data.name,
      quantity: data.quantity,
      unit: data.unit,
      note: data.note ?? null,
      purchased: false,
      category: tempCategory
        ? { id: tempCategory.id, name: tempCategory.name, icon: tempCategory.icon }
        : null,
      position: newPosition,
      createdBy: null,
    }

    setLists((prev) =>
      prev.map((l) =>
        l.id === listId ? { ...l, items: [...l.items, tempItem] } : l
      )
    )

    try {
      const updatedList = await addShoppingListItems(listId, [
        { name: data.name, quantity: data.quantity, unit: data.unit, categoryId: data.categoryId, note: data.note, position: newPosition },
      ], spaceId)
      setLists((prev) =>
        prev.map((l) => (l.id === listId ? updatedList : l))
      )
    } catch (e) {
      if (handleConflict(e)) return
      setLists((prev) =>
        prev.map((l) =>
          l.id === listId
            ? { ...l, items: l.items.filter((it) => it.id !== tempId) }
            : l
        )
      )
    }
  }

  // --- Smart group (AI auto-categorize) ---
  async function handleSmartGroup(listId: string) {
    setSmartGroupingListId(listId)
    try {
      const updatedList = await smartGroupShoppingList(listId, spaceId)
      setLists((prev) =>
        prev.map((l) => (l.id === listId ? updatedList : l))
      )
    } catch (e) {
      handleConflict(e)
    } finally {
      setSmartGroupingListId(null)
    }
  }

  // --- Share to space (copy list) ---
  async function handleShareToSpace(targetSpaceId: string | null) {
    if (!sharingListId) return
    const list = lists.find((l) => l.id === sharingListId)
    if (!list) return

    setSharingLoading(true)
    try {
      await createShoppingList(
        {
          name: list.name,
          items: list.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            purchased: item.purchased,
            categoryId: item.category?.id,
            note: item.note ?? undefined,
            position: item.position,
          })),
        },
        targetSpaceId ?? undefined,
      )
      setSharingListId(null)
      toast.success(t("shareSuccess"))
    } catch {
      toast.error(t("shareError"))
    } finally {
      setSharingLoading(false)
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

        {lists.map((list) => {
          const checkedCount = list.items.filter((i) => i.purchased).length
          return (
            <ShoppingListCard
              key={list.id}
              defaultOpen={combineMode ? false : false}
              title={list.name}
              description={t("purchased", {
                checked: checkedCount,
                total: list.items.length,
              })}
              items={list.items.map((item) => {
                const fullCat = item.category
                  ? categories.find((c) => c.id === item.category!.id)
                  : null
                return {
                  id: item.id,
                  name: item.name,
                  badge: formatQty(item.quantity, item.unit),
                  noteBadge: item.category
                    ? `${item.category.icon ?? ""} ${fullCat ? localizeCategoryName(fullCat) : item.category.name}`.trim()
                    : null,
                  note: item.note,
                  checked: item.purchased,
                  rawQuantity: item.quantity,
                  rawUnit: item.unit,
                  rawCategoryId: item.category?.id,
                  createdByName: activeSpaceId ? item.createdBy?.name : undefined,
                }
              })}
              createdAt={t("createdAt", { date: formatDate(list.createdAt, locale) })}
              onToggleItem={(index) => toggleItem(list.id, index)}
              onReorderItems={combineMode ? undefined : (from, to) => reorderItems(list.id, from, to)}
              onEditTitle={undefined}
              onDelete={combineMode ? undefined : () => removeList(list.id)}
              onEditItem={combineMode ? undefined : (index, data) => handleEditItem(list.id, index, data)}
              onDeleteItem={combineMode ? undefined : (index) => handleDeleteItem(list.id, index)}
              onAddItem={combineMode ? undefined : (data) => handleAddItem(list.id, data)}
              unitOptions={UNITS.map((u) => ({ value: u, label: t(`units.${u}`) }))}
              categoryOptions={categoryOptions}
              categoryPlaceholder={t("categoryPlaceholder")}
              addItemPlaceholder={t("itemNamePlaceholder")}
              qtyPlaceholder={t("qtyPlaceholder")}
              unitPlaceholder={t("unitPlaceholder")}
              notePlaceholder={t("notePlaceholder")}
              grouped={list.groupedByCategories}
              onToggleGrouped={combineMode ? undefined : () => toggleGrouped(list.id)}
              groupByLabel={t("groupByCategory")}
              uncategorizedLabel={t("uncategorized")}
              onShareToSpace={combineMode || (spaces.length === 0 && !activeSpaceId) ? undefined : () => setSharingListId(list.id)}
              shareToSpaceLabel={t("shareToSpace")}
              onSmartGroup={combineMode ? undefined : () => handleSmartGroup(list.id)}
              smartGroupLoading={smartGroupingListId === list.id}
              smartGroupLabel={t("smartGroup")}
              selectable={combineMode}
              selected={selectedListIds.has(list.id)}
              onSelect={() => toggleSelectList(list.id)}
              onOpen={combineMode ? undefined : () => router.push(activeSpaceId ? `/shopping-list/${list.id}?spaceId=${activeSpaceId}` : `/shopping-list/${list.id}`)}
            />
          )
        })}

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
      {/* Share to space dialog */}
      <Dialog open={!!sharingListId} onOpenChange={(open) => { if (!open) setSharingListId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="size-4" />
              {t("shareToSpaceTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            {activeSpaceId && (
              <Button
                variant="outline"
                className="justify-start gap-2"
                disabled={sharingLoading}
                onClick={() => handleShareToSpace(null)}
              >
                <User className="size-4" />
                {t("myLists")}
              </Button>
            )}
            {spaces
              .filter((s) => s.id !== activeSpaceId)
              .map((space) => (
                <Button
                  key={space.id}
                  variant="outline"
                  className="justify-start gap-2"
                  disabled={sharingLoading}
                  onClick={() => handleShareToSpace(space.id)}
                >
                  {space.name}
                </Button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
