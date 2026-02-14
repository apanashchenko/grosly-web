"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { Loader2, Plus, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/shared/page-header"
import { SortableItem } from "./sortable-item"
import type { ItemData } from "./types"
import { useRouter } from "@/i18n/navigation"
import { createShoppingList, getCategories } from "@/lib/api"
import { UNITS, type Category, type ShoppingListItemRequest } from "@/lib/types"
import { NONE_CATEGORY } from "@/lib/constants"
import { useCategoryLocalization } from "@/hooks/use-category-localization"

interface PendingItem {
  id: number
  name: string
  quantity: number | null
  unit: string | null
  categoryId: string | null
  note: string | null
}

let nextPendingId = 0

export function ShoppingListNew() {
  const t = useTranslations("ShoppingList")
  const router = useRouter()
  const searchParams = useSearchParams()
  const spaceId = searchParams.get("spaceId") ?? undefined
  const initialName = searchParams.get("name") ?? ""
  const { localizeCategoryName } = useCategoryLocalization()

  const [categories, setCategories] = useState<Category[]>([])
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
  const [listName, setListName] = useState(initialName)
  const [name, setName] = useState("")
  const [quantity, setQuantity] = useState("")
  const [unit, setUnit] = useState("")
  const [categoryId, setCategoryId] = useState(NONE_CATEGORY)
  const [note, setNote] = useState("")
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setPendingItems((prev) => arrayMove(prev, active.id as number, over.id as number))
    }
  }

  const fetchCategories = useCallback(async () => {
    try {
      const data = await getCategories()
      setCategories(data)
    } catch {
      // Categories are optional — silently fail
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  function formatPendingQty(item: PendingItem): string | null {
    if (item.quantity !== null) {
      const label = item.unit ? t(`units.${item.unit}`) : ""
      return label ? `${item.quantity} ${label}` : `${item.quantity}`
    }
    return null
  }

  function formatPendingCategory(item: PendingItem): string | null {
    if (!item.categoryId) return null
    const cat = categories.find((c) => c.id === item.categoryId)
    if (!cat) return null
    return `${cat.icon ?? ""} ${localizeCategoryName(cat)}`.trim()
  }

  function addItem() {
    const trimmedName = name.trim()
    if (!trimmedName) return
    setPendingItems((prev) => [
      ...prev,
      {
        id: nextPendingId++,
        name: trimmedName,
        quantity: quantity ? Number(quantity) : null,
        unit: unit || null,
        categoryId: categoryId === NONE_CATEGORY ? null : categoryId,
        note: note.trim() || null,
      },
    ])
    setName("")
    setQuantity("")
    setUnit("")
    setCategoryId(NONE_CATEGORY)
    setNote("")
  }

  function removePendingItem(id: number) {
    setPendingItems((prev) => prev.filter((item) => item.id !== id))
  }

  function savePendingItem(id: number, data: ItemData) {
    setPendingItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              name: data.name,
              quantity: data.quantity || null,
              unit: data.unit || null,
              categoryId: data.categoryId || null,
              note: data.note || null,
            }
          : item
      )
    )
    setEditingItemId(null)
  }

  const unitOptions = UNITS.map((u) => ({ value: u, label: t(`units.${u}`) }))
  const categoryOptionsList = categories.map((c) => ({
    value: c.id,
    label: localizeCategoryName(c),
    icon: c.icon,
  }))

  async function handleCreateList() {
    if (pendingItems.length === 0) return
    setCreating(true)
    setError(null)
    try {
      const items: ShoppingListItemRequest[] = pendingItems.map((item, i) => ({
        name: item.name,
        quantity: item.quantity ?? 0,
        unit: item.unit ?? "pcs",
        categoryId: item.categoryId || undefined,
        note: item.note || undefined,
        position: i,
      }))
      await createShoppingList({
        name: listName.trim() || undefined,
        items,
      }, spaceId)
      router.push(spaceId ? `/shopping-list?spaceId=${spaceId}` : "/shopping-list")
    } catch (e) {
      setError(e instanceof Error ? e.message : t("unexpectedError"))
      setCreating(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <PageHeader title={t("newListHeading")} subtitle={t("newListSubtitle")} />

      <Card>
        <CardHeader>
          <CardTitle>{t("addItemsTitle")}</CardTitle>
          <CardDescription>{t("addItemsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              addItem()
            }}
            className="space-y-2"
          >
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("itemNamePlaceholder")}
                className="flex-1"
              />
              <Button type="submit" disabled={!name.trim()}>
                <Plus />
                {t("addButton")}
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={t("qtyPlaceholder")}
                min={0}
                step="any"
                className="w-20"
              />
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder={t("unitPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {t(`units.${u}`)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {categories.length > 0 && (
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={t("categoryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={NONE_CATEGORY}>—</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.icon ? `${c.icon} ${localizeCategoryName(c)}` : localizeCategoryName(c)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            </div>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("notePlaceholder")}
            />
          </form>

          {pendingItems.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={pendingItems.map((_, i) => i)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {pendingItems.map((item, index) => (
                    <SortableItem
                      key={item.id}
                      item={{
                        name: item.name,
                        badge: formatPendingQty(item),
                        noteBadge: formatPendingCategory(item),
                        note: item.note,
                        checked: false,
                        rawQuantity: item.quantity ?? 0,
                        rawUnit: item.unit ?? "pcs",
                        rawCategoryId: item.categoryId ?? undefined,
                      }}
                      index={index}
                      sortable
                      editing={editingItemId === item.id}
                      onStartEdit={() => setEditingItemId(item.id)}
                      onSaveEdit={(data) => savePendingItem(item.id, data)}
                      onCancelEdit={() => setEditingItemId(null)}
                      onDeleteItem={() => removePendingItem(item.id)}
                      unitOptions={unitOptions}
                      categoryOptions={categoryOptionsList.length > 0 ? categoryOptionsList : undefined}
                      categoryPlaceholder={t("categoryPlaceholder")}
                      notePlaceholder={t("notePlaceholder")}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="space-y-2">
            <Input
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder={t("listNamePlaceholder")}
            />
            <Button
              onClick={handleCreateList}
              disabled={pendingItems.length === 0 || creating}
              className="w-full shadow-md hover:shadow-lg"
              size="lg"
            >
              {creating ? (
                <Loader2 className="animate-spin" />
              ) : (
                <ShoppingCart />
              )}
              {creating ? t("creating") : t("createListButton")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
