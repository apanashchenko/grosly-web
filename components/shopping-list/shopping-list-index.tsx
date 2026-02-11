"use client"

import { useCallback, useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { arrayMove } from "@dnd-kit/sortable"
import { Loader2, Merge, Plus, RefreshCw, ShoppingCart, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ShoppingListCard, type CategoryOption } from "@/components/shopping-list/shopping-list-card"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Link } from "@/i18n/navigation"
import {
  getShoppingLists,
  getCategories,
  updateShoppingList,
  deleteShoppingList,
  addShoppingListItems,
  updateShoppingListItem,
  deleteShoppingListItem,
  smartGroupShoppingList,
  combineShoppingLists,
} from "@/lib/api"
import {
  UNITS,
  type Category,
  type ShoppingListResponse,
  type ShoppingListItemResponse,
} from "@/lib/types"
import { useCategoryLocalization } from "@/hooks/use-category-localization"


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

  const [lists, setLists] = useState<ShoppingListResponse[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [smartGroupingListId, setSmartGroupingListId] = useState<string | null>(null)
  const [combineMode, setCombineMode] = useState(false)
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set())
  const [combineName, setCombineName] = useState("")
  const [combining, setCombining] = useState(false)
  const [combineError, setCombineError] = useState<string | null>(null)

  const fetchLists = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [listsData, categoriesData] = await Promise.all([
        getShoppingLists(),
        getCategories().catch(() => [] as Category[]),
      ])
      setLists(listsData)
      setCategories(categoriesData)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t("loadError"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchLists()
  }, [fetchLists])

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
      await updateShoppingListItem(listId, item.id, { purchased: newPurchased })
    } catch {
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
      await updateShoppingList(listId, {
        itemPositions: reordered.map((item, i) => ({ id: item.id, position: i })),
      })
    } catch {
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
      await updateShoppingList(listId, { name: newName })
    } catch {
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
      await deleteShoppingList(listId)
    } catch {
      if (removed) {
        setLists((prev) => [...prev, removed])
      }
    }
  }

  // --- Edit item ---
  async function handleEditItem(listId: string, index: number, data: { name: string; quantity: number; unit: string; categoryId?: string }) {
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
      await updateShoppingListItem(listId, item.id, {
        name: data.name,
        quantity: data.quantity,
        unit: data.unit,
        categoryId: data.categoryId,
      })
    } catch {
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
      await deleteShoppingListItem(listId, item.id)
    } catch {
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
      await updateShoppingList(listId, { groupedByCategories: newValue })
    } catch {
      setLists((prev) =>
        prev.map((l) =>
          l.id === listId ? { ...l, groupedByCategories: !newValue } : l
        )
      )
    }
  }

  // --- Add item to existing list ---
  async function handleAddItem(listId: string, data: { name: string; quantity: number; unit: string; categoryId?: string }) {
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
      purchased: false,
      category: tempCategory
        ? { id: tempCategory.id, name: tempCategory.name, icon: tempCategory.icon }
        : null,
      position: newPosition,
    }

    setLists((prev) =>
      prev.map((l) =>
        l.id === listId ? { ...l, items: [...l.items, tempItem] } : l
      )
    )

    try {
      const updatedList = await addShoppingListItems(listId, [
        { name: data.name, quantity: data.quantity, unit: data.unit, categoryId: data.categoryId, position: newPosition },
      ])
      setLists((prev) =>
        prev.map((l) => (l.id === listId ? updatedList : l))
      )
    } catch {
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
      const updatedList = await smartGroupShoppingList(listId)
      setLists((prev) =>
        prev.map((l) => (l.id === listId ? updatedList : l))
      )
    } catch {
      // no-op, keep list as-is
    } finally {
      setSmartGroupingListId(null)
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
      })
      setLists((prev) => [newList, ...prev])
      exitCombineMode()
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("combineError")
      setCombineError(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setCombining(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader title={t("heading")} subtitle={t("subtitle")} />

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
                <Merge className="size-4" />
                {t("combineButton")}
              </Button>
            )}
            <Button asChild className="shadow-md hover:shadow-lg">
              <Link href="/shopping-list/new">
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
            <Button variant="outline" onClick={fetchLists} className="mt-4">
              <RefreshCw className="size-4" />
              {t("retry")}
            </Button>
          </EmptyState>
        )}

        {!loading && !loadError && lists.length === 0 && (
          <EmptyState icon={ShoppingCart} message={t("emptyLists")} />
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
                  checked: item.purchased,
                  rawQuantity: item.quantity,
                  rawUnit: item.unit,
                  rawCategoryId: item.category?.id,
                }
              })}
              createdAt={t("createdAt", { date: formatDate(list.createdAt, locale) })}
              onToggleItem={(index) => toggleItem(list.id, index)}
              onReorderItems={combineMode ? undefined : (from, to) => reorderItems(list.id, from, to)}
              onEditTitle={combineMode ? undefined : (name) => handleEditListName(list.id, name)}
              onDelete={combineMode ? undefined : () => removeList(list.id)}
              onEditItem={combineMode ? undefined : (index, data) => handleEditItem(list.id, index, data)}
              onDeleteItem={combineMode ? undefined : (index) => handleDeleteItem(list.id, index)}
              onAddItem={combineMode ? undefined : (data) => handleAddItem(list.id, data)}
              unitOptions={UNITS.map((u) => ({ value: u, label: t(`units.${u}`) }))}
              categoryOptions={categoryOptions}
              categoryPlaceholder={t("categoryPlaceholder")}
              addItemPlaceholder={t("itemNamePlaceholder")}
              grouped={list.groupedByCategories}
              onToggleGrouped={combineMode ? undefined : () => toggleGrouped(list.id)}
              groupByLabel={t("groupByCategory")}
              uncategorizedLabel={t("uncategorized")}
              onSmartGroup={combineMode ? undefined : () => handleSmartGroup(list.id)}
              smartGroupLoading={smartGroupingListId === list.id}
              smartGroupLabel={t("smartGroup")}
              selectable={combineMode}
              selected={selectedListIds.has(list.id)}
              onSelect={() => toggleSelectList(list.id)}
            />
          )
        })}
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
