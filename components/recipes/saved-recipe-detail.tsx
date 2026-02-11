"use client"

import { useCallback, useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { arrayMove } from "@dnd-kit/sortable"
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ShoppingListCard, type CategoryOption } from "@/components/shopping-list/shopping-list-card"
import { Link } from "@/i18n/navigation"
import {
  getSavedRecipe,
  getShoppingList,
  getCategories,
  updateShoppingList,
  updateShoppingListItem,
  deleteShoppingListItem,
  addShoppingListItems,
  smartGroupShoppingList,
} from "@/lib/api"
import {
  UNITS,
  type SavedRecipeResponse,
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

const SOURCE_STYLES: Record<string, string> = {
  PARSED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  GENERATED: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
  SUGGESTED: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
}

interface Props {
  recipeId: string
}

export function SavedRecipeDetail({ recipeId }: Props) {
  const t = useTranslations("SavedRecipes")
  const tList = useTranslations("ShoppingList")
  const locale = useLocale()
  const { localizeCategoryName } = useCategoryLocalization()

  const [recipe, setRecipe] = useState<SavedRecipeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [list, setList] = useState<ShoppingListResponse | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [smartGrouping, setSmartGrouping] = useState(false)

  const fetchRecipe = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await getSavedRecipe(recipeId)
      setRecipe(data)

      if (data.shoppingListId) {
        const [listData, categoriesData] = await Promise.all([
          getShoppingList(data.shoppingListId),
          getCategories().catch(() => [] as Category[]),
        ])
        setList(listData)
        setCategories(categoriesData)
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t("unexpectedError"))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId])

  useEffect(() => {
    fetchRecipe()
  }, [fetchRecipe])

  const categoryOptions: CategoryOption[] = categories.map((c) => ({
    value: c.id,
    label: localizeCategoryName(c),
    icon: c.icon,
  }))

  function formatQty(quantity: number, unit: string): string {
    const label = UNITS.includes(unit as (typeof UNITS)[number])
      ? tList(`units.${unit}`)
      : unit
    return label ? `${quantity} ${label}` : `${quantity}`
  }

  // --- Shopping list handlers ---

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
      await updateShoppingListItem(list.id, item.id, { purchased: newPurchased })
    } catch {
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
      })
    } catch {
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
      await updateShoppingListItem(list.id, item.id, { name: data.name, quantity: data.quantity, unit: data.unit, categoryId: data.categoryId })
    } catch {
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
      await deleteShoppingListItem(list.id, item.id)
    } catch {
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
      ])
      setList(updatedList)
    } catch {
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
      await updateShoppingList(list.id, { name })
    } catch {
      setList((prev) => (prev ? { ...prev, name: prevName } : prev))
    }
  }

  async function toggleGrouped() {
    if (!list) return
    const newValue = !list.groupedByCategories
    setList((prev) => (prev ? { ...prev, groupedByCategories: newValue } : prev))

    try {
      await updateShoppingList(list.id, { groupedByCategories: newValue })
    } catch {
      setList((prev) => (prev ? { ...prev, groupedByCategories: !newValue } : prev))
    }
  }

  async function handleSmartGroup() {
    if (!list) return
    setSmartGrouping(true)
    try {
      const updatedList = await smartGroupShoppingList(list.id)
      setList(updatedList)
    } catch {
      // keep as-is
    } finally {
      setSmartGrouping(false)
    }
  }

  const hasShoppingList = recipe?.shoppingListId && list

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/recipes">
            <ArrowLeft className="size-4" />
            {t("backToRecipes")}
          </Link>
        </Button>
      </div>

      {loading && (
        <EmptyState icon={Loader2} message={t("loading")} />
      )}

      {loadError && (
        <EmptyState icon={RefreshCw} message={t("loadError")} variant="error">
          <Button variant="outline" size="sm" onClick={fetchRecipe}>
            {t("retry")}
          </Button>
        </EmptyState>
      )}

      {recipe && (
        <>
          <PageHeader
            title={recipe.title}
            subtitle={t("detailSubtitle")}
          />

          <div className={hasShoppingList ? "grid items-start gap-6 lg:grid-cols-2" : ""}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>{t("recipeTextTitle")}</CardTitle>
                  <Badge
                    variant="outline"
                    className={`text-xs ${SOURCE_STYLES[recipe.source] ?? ""}`}
                  >
                    {t(`source.${recipe.source}`)}
                  </Badge>
                </div>
                <CardDescription>
                  {t("createdAt", {
                    date: formatDate(recipe.createdAt, locale),
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {recipe.text}
                </div>
              </CardContent>
            </Card>

            {list && (
              <ShoppingListCard
                title={list.name}
                description={tList("purchased", {
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
                  }
                })}
                createdAt={tList("createdAt", { date: formatDate(list.createdAt, locale) })}
                defaultOpen
                onToggleItem={toggleItem}
                onReorderItems={reorderItems}
                onEditTitle={handleEditTitle}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
                onAddItem={handleAddItem}
                unitOptions={UNITS.map((u) => ({ value: u, label: tList(`units.${u}`) }))}
                categoryOptions={categoryOptions}
                categoryPlaceholder={tList("categoryPlaceholder")}
                addItemPlaceholder={tList("itemNamePlaceholder")}
                grouped={list.groupedByCategories}
                onToggleGrouped={toggleGrouped}
                groupByLabel={tList("groupByCategory")}
                uncategorizedLabel={tList("uncategorized")}
                onSmartGroup={handleSmartGroup}
                smartGroupLoading={smartGrouping}
                smartGroupLabel={tList("smartGroup")}
              />
            )}
          </div>
        </>
      )}
    </main>
  )
}
