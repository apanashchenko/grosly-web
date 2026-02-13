"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { arrayMove } from "@dnd-kit/sortable"
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ShoppingListCard, type CategoryOption } from "@/components/shopping-list/shopping-list-card"
import { Link } from "@/i18n/navigation"
import { toast } from "sonner"
import {
  getShoppingList,
  getCategories,
  updateShoppingList,
  updateShoppingListItem,
  deleteShoppingListItem,
  addShoppingListItems,
  smartGroupShoppingList,
  ConflictError,
} from "@/lib/api"
import {
  UNITS,
  type ShoppingListResponse,
  type Category,
  type ShoppingListItemResponse,
} from "@/lib/types"
import { useCategoryLocalization } from "@/hooks/use-category-localization"

function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

interface Props {
  listId: string
}

export function ShoppingListDetail({ listId }: Props) {
  const t = useTranslations("ShoppingList")
  const locale = useLocale()
  const { localizeCategoryName } = useCategoryLocalization()
  const searchParams = useSearchParams()
  const spaceId = searchParams.get("spaceId") ?? undefined

  const [list, setList] = useState<ShoppingListResponse | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [smartGrouping, setSmartGrouping] = useState(false)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [listData, categoriesData] = await Promise.all([
        getShoppingList(listId, spaceId),
        getCategories().catch(() => [] as Category[]),
      ])
      setList(listData)
      setCategories(categoriesData)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t("unexpectedError"))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId, spaceId])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const categoryOptions: CategoryOption[] = categories.map((c) => ({
    value: c.id,
    label: localizeCategoryName(c),
    icon: c.icon,
  }))

  function handleConflict(e: unknown): boolean {
    if (e instanceof ConflictError) {
      toast.error(t("conflictError"))
      fetchList()
      return true
    }
    return false
  }

  function formatQty(quantity: number, unit: string): string {
    const label = UNITS.includes(unit as (typeof UNITS)[number])
      ? t(`units.${unit}`)
      : unit
    return label ? `${quantity} ${label}` : `${quantity}`
  }

  async function toggleItem(index: number) {
    if (!list) return
    const item = list.items[index]
    if (!item) return
    const newPurchased = !item.purchased

    setList((prev) =>
      prev
        ? { ...prev, items: prev.items.map((it, i) => (i === index ? { ...it, purchased: newPurchased } : it)) }
        : prev
    )

    try {
      await updateShoppingListItem(list.id, item.id, { purchased: newPurchased }, spaceId)
    } catch (e) {
      if (handleConflict(e)) return
      setList((prev) =>
        prev
          ? { ...prev, items: prev.items.map((it, i) => (i === index ? { ...it, purchased: !newPurchased } : it)) }
          : prev
      )
    }
  }

  async function reorderItems(fromIndex: number, toIndex: number) {
    if (!list) return
    const prevItems = list.items
    const reordered = arrayMove(list.items, fromIndex, toIndex)
    setList((prev) => (prev ? { ...prev, items: reordered } : prev))

    try {
      await updateShoppingList(list.id, {
        itemPositions: reordered.map((item, i) => ({ id: item.id, position: i })),
      }, spaceId)
    } catch (e) {
      if (handleConflict(e)) return
      setList((prev) => (prev ? { ...prev, items: prevItems } : prev))
    }
  }

  async function handleEditItem(index: number, data: { name: string; quantity: number; unit: string; categoryId?: string }) {
    if (!list) return
    const item = list.items[index]
    if (!item) return
    const prevItem = { ...item }
    const newCategory = data.categoryId
      ? categories.find((c) => c.id === data.categoryId) ?? null
      : null

    setList((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((it, i) =>
              i === index
                ? { ...it, name: data.name, quantity: data.quantity, unit: data.unit, category: newCategory ? { id: newCategory.id, name: newCategory.name, icon: newCategory.icon } : null }
                : it
            ),
          }
        : prev
    )

    try {
      await updateShoppingListItem(list.id, item.id, { name: data.name, quantity: data.quantity, unit: data.unit, categoryId: data.categoryId }, spaceId)
    } catch (e) {
      if (handleConflict(e)) return
      setList((prev) =>
        prev
          ? { ...prev, items: prev.items.map((it, i) => (i === index ? prevItem : it)) }
          : prev
      )
    }
  }

  async function handleDeleteItem(index: number) {
    if (!list) return
    const item = list.items[index]
    if (!item) return
    const prevItems = [...list.items]

    setList((prev) =>
      prev ? { ...prev, items: prev.items.filter((_, i) => i !== index) } : prev
    )

    try {
      await deleteShoppingListItem(list.id, item.id, spaceId)
    } catch (e) {
      if (handleConflict(e)) return
      setList((prev) => (prev ? { ...prev, items: prevItems } : prev))
    }
  }

  async function handleAddItem(data: { name: string; quantity: number; unit: string; categoryId?: string }) {
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
      category: tempCategory ? { id: tempCategory.id, name: tempCategory.name, icon: tempCategory.icon } : null,
      position: newPosition,
      createdBy: null,
    }

    setList((prev) => (prev ? { ...prev, items: [...prev.items, tempItem] } : prev))

    try {
      const updatedList = await addShoppingListItems(list.id, [
        { name: data.name, quantity: data.quantity, unit: data.unit, categoryId: data.categoryId, position: newPosition },
      ], spaceId)
      setList(updatedList)
    } catch (e) {
      if (handleConflict(e)) return
      setList((prev) =>
        prev ? { ...prev, items: prev.items.filter((it) => it.id !== tempId) } : prev
      )
    }
  }

  async function handleEditTitle(name: string) {
    if (!list) return
    const prevName = list.name
    setList((prev) => (prev ? { ...prev, name } : prev))

    try {
      await updateShoppingList(list.id, { name }, spaceId)
    } catch (e) {
      if (handleConflict(e)) return
      setList((prev) => (prev ? { ...prev, name: prevName } : prev))
    }
  }

  async function toggleGrouped() {
    if (!list) return
    const newValue = !list.groupedByCategories
    setList((prev) => (prev ? { ...prev, groupedByCategories: newValue } : prev))

    try {
      await updateShoppingList(list.id, { groupedByCategories: newValue }, spaceId)
    } catch (e) {
      if (handleConflict(e)) return
      setList((prev) => (prev ? { ...prev, groupedByCategories: !newValue } : prev))
    }
  }

  async function handleSmartGroup() {
    if (!list) return
    setSmartGrouping(true)
    try {
      const updatedList = await smartGroupShoppingList(list.id, spaceId)
      setList(updatedList)
    } catch (e) {
      handleConflict(e)
    } finally {
      setSmartGrouping(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={spaceId ? `/shopping-list?spaceId=${spaceId}` : "/shopping-list"}>
            <ArrowLeft className="size-4" />
            {t("backToLists")}
          </Link>
        </Button>
      </div>

      {loading && (
        <EmptyState icon={Loader2} message={t("loading")} />
      )}

      {loadError && (
        <EmptyState icon={RefreshCw} message={t("loadError")} variant="error">
          <Button variant="outline" size="sm" onClick={fetchList}>
            {t("retry")}
          </Button>
        </EmptyState>
      )}

      {list && (
        <>
          <div className="mb-6">
            <PageHeader title={t("heading")} />
          </div>

          <ShoppingListCard
            title={list.name}
            description={t("purchased", {
              checked: list.items.filter((i) => i.purchased).length,
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
                createdByName: spaceId ? item.createdBy?.name ?? undefined : undefined,
              }
            })}
            createdAt={t("createdAt", { date: formatDate(list.createdAt, locale) })}
            defaultOpen
            onToggleItem={toggleItem}
            onReorderItems={reorderItems}
            onEditTitle={handleEditTitle}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
            onAddItem={handleAddItem}
            unitOptions={UNITS.map((u) => ({ value: u, label: t(`units.${u}`) }))}
            categoryOptions={categoryOptions}
            categoryPlaceholder={t("categoryPlaceholder")}
            addItemPlaceholder={t("itemNamePlaceholder")}
            grouped={list.groupedByCategories}
            onToggleGrouped={toggleGrouped}
            groupByLabel={t("groupByCategory")}
            uncategorizedLabel={t("uncategorized")}
            onSmartGroup={handleSmartGroup}
            smartGroupLoading={smartGrouping}
            smartGroupLabel={t("smartGroup")}
          />
        </>
      )}
    </main>
  )
}
