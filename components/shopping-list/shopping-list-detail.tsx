"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { arrayMove } from "@dnd-kit/sortable"
import { ArrowLeft, Loader2, RefreshCw, Share2, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ShoppingListCard, type CategoryOption } from "@/components/shopping-list/shopping-list-card"
import { Link, useRouter } from "@/i18n/navigation"
import { toast } from "sonner"
import {
  getShoppingList,
  getCategories,
  getSpaces,
  createShoppingList,
  updateShoppingList,
  updateShoppingListItem,
  deleteShoppingListItem,
  deleteShoppingList,
  addShoppingListItems,
  smartGroupShoppingList,
  ConflictError,
} from "@/lib/api"
import {
  UNITS,
  type ShoppingListResponse,
  type Category,
  type ShoppingListItemResponse,
  type SpaceResponse,
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
  const router = useRouter()
  const { localizeCategoryName } = useCategoryLocalization()
  const searchParams = useSearchParams()
  const spaceId = searchParams.get("spaceId") ?? undefined

  const [list, setList] = useState<ShoppingListResponse | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [smartGrouping, setSmartGrouping] = useState(false)
  const [spaces, setSpaces] = useState<SpaceResponse[]>([])
  const [sharingOpen, setSharingOpen] = useState(false)
  const [sharingLoading, setSharingLoading] = useState(false)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [listData, categoriesData, spacesData] = await Promise.all([
        getShoppingList(listId, spaceId),
        getCategories().catch(() => [] as Category[]),
        getSpaces({ limit: 100 }).then((res) => res.data).catch(() => [] as SpaceResponse[]),
      ])
      setList(listData)
      setCategories(categoriesData)
      setSpaces(spacesData)
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

  async function handleEditItem(index: number, data: { name: string; quantity: number; unit: string; categoryId?: string; note?: string }) {
    if (!list) return
    const item = list.items[index]
    if (!item) return

    try {
      await updateShoppingListItem(list.id, item.id, { name: data.name, quantity: data.quantity, unit: data.unit, categoryId: data.categoryId, note: data.note }, spaceId)
      const fresh = await getShoppingList(listId, spaceId)
      setList(fresh)
    } catch (e) {
      if (handleConflict(e)) return
    }
  }

  async function handleDeleteItem(index: number) {
    if (!list) return
    const item = list.items[index]
    if (!item) return

    try {
      await deleteShoppingListItem(list.id, item.id, spaceId)
      const fresh = await getShoppingList(listId, spaceId)
      setList(fresh)
    } catch (e) {
      if (handleConflict(e)) return
    }
  }

  async function handleAddItem(data: { name: string; quantity: number; unit: string; categoryId?: string; note?: string }) {
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
      category: tempCategory ? { id: tempCategory.id, name: tempCategory.name, icon: tempCategory.icon } : null,
      position: newPosition,
      createdBy: null,
    }

    setList((prev) => (prev ? { ...prev, items: [...prev.items, tempItem] } : prev))

    try {
      const updatedList = await addShoppingListItems(list.id, [
        { name: data.name, quantity: data.quantity, unit: data.unit, categoryId: data.categoryId, note: data.note, position: newPosition },
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

  async function handleDeleteList() {
    if (!list) return
    try {
      await deleteShoppingList(list.id, spaceId)
      router.push(spaceId ? `/shopping-list?spaceId=${spaceId}` : "/shopping-list")
    } catch {
      toast.error(t("unexpectedError"))
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

  async function handleTogglePin() {
    if (!list) return
    const newPinned = !list.isPinned
    setList((prev) => (prev ? { ...prev, isPinned: newPinned } : prev))

    try {
      const updated = await updateShoppingList(list.id, { isPinned: newPinned, version: list.version }, spaceId)
      setList(updated)
    } catch (e) {
      if (handleConflict(e)) return
      setList((prev) => (prev ? { ...prev, isPinned: !newPinned } : prev))
    }
  }

  async function handleEditLabel(newLabel: string | null) {
    if (!list) return
    const prevLabel = list.label
    setList((prev) => (prev ? { ...prev, label: newLabel } : prev))

    try {
      await updateShoppingList(list.id, { label: newLabel }, spaceId)
    } catch (e) {
      if (handleConflict(e)) return
      setList((prev) => (prev ? { ...prev, label: prevLabel } : prev))
    }
  }

  async function handleShareToSpace(targetSpaceId: string | null) {
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
      setSharingOpen(false)
      toast.success(t("shareSuccess"))
    } catch {
      toast.error(t("shareError"))
    } finally {
      setSharingLoading(false)
    }
  }

  const showShareButton = spaces.length > 0 || !!spaceId

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
                note: item.note,
                checked: item.purchased,
                rawQuantity: item.quantity,
                rawUnit: item.unit,
                rawCategoryId: item.category?.id,
                createdByName: spaceId ? item.createdBy?.name ?? undefined : undefined,
              }
            })}
            createdAt={t("createdAt", { date: formatDate(list.createdAt, locale) })}
            label={list.label}
            onEditLabel={handleEditLabel}
            labelPlaceholder={t("labelPlaceholder")}
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
            qtyPlaceholder={t("qtyPlaceholder")}
            unitPlaceholder={t("unitPlaceholder")}
            notePlaceholder={t("notePlaceholder")}
            grouped={list.groupedByCategories}
            onToggleGrouped={toggleGrouped}
            groupByLabel={t("groupByCategory")}
            uncategorizedLabel={t("uncategorized")}
            onSmartGroup={handleSmartGroup}
            smartGroupLoading={smartGrouping}
            smartGroupLabel={t("smartGroup")}
            onShareToSpace={showShareButton ? () => setSharingOpen(true) : undefined}
            shareToSpaceLabel={t("shareToSpace")}
            isPinned={list.isPinned}
            onTogglePin={handleTogglePin}
            pinLabel={t("pin")}
            onDelete={handleDeleteList}
            deleteTitle={t("deleteListTitle")}
            deleteDescription={t("deleteListDescription")}
            deleteConfirm={t("deleteListConfirm")}
            deleteCancel={t("deleteListCancel")}
          />
        </>
      )}

      <Dialog open={sharingOpen} onOpenChange={setSharingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="size-4" />
              {t("shareToSpaceTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            {spaceId && (
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
              .filter((s) => s.id !== spaceId)
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
