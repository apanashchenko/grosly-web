"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Check, ChevronDown, ChevronRight, Loader2, Search, UtensilsCrossed } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/shared/empty-state"
import { RecipeDetailContent } from "@/components/meal-plans/recipe-detail-content"
import { getSavedRecipes, getSavedRecipe } from "@/lib/api"
import type { SavedRecipeListItem, SavedRecipeResponse } from "@/lib/types"
import { usePaginatedList } from "@/hooks/use-paginated-list"
import { useCategoryLocalization } from "@/hooks/use-category-localization"
import { useCategories } from "@/hooks/use-categories"
import { SOURCE_STYLES } from "@/lib/constants"

function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(new Date(iso))
}

interface RecipePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (recipeIds: string[]) => void
  adding: boolean
  excludeRecipeIds?: string[]
  title?: string
  description?: string
  confirmLabel?: string
  confirmingLabel?: string
  cancelLabel?: string
  emptyMessage?: string
  searchPlaceholder?: string
  noSearchResults?: string
}

export function RecipePickerDialog({
  open,
  onOpenChange,
  onAdd,
  adding,
  excludeRecipeIds = [],
  title,
  description,
  confirmLabel,
  confirmingLabel,
  cancelLabel,
  emptyMessage,
  searchPlaceholder,
  noSearchResults,
}: RecipePickerDialogProps) {
  const t = useTranslations("MealPlans")
  const tSaved = useTranslations("SavedRecipes")
  const tList = useTranslations("ShoppingList")
  const locale = useLocale()
  const { localizeCategoryName } = useCategoryLocalization()
  const { categoryMap } = useCategories()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [detailsCache, setDetailsCache] = useState<Map<string, SavedRecipeResponse>>(new Map())
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set())

  const {
    items: recipes,
    loading,
    loadingMore,
    error,
    hasMore,
    sentinelRef,
  } = usePaginatedList<SavedRecipeListItem>(
    (params, signal) => getSavedRecipes({ ...params, search: debouncedSearch || undefined }, signal),
    [open, debouncedSearch],
    t("unexpectedError"),
    { enabled: open },
  )

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelected(new Set())
      setSearch("")
      setDebouncedSearch("")
      setExpandedIds(new Set())
      setDetailsCache(new Map())
      setLoadingDetails(new Set())
    }
  }, [open])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const available = recipes.filter((r) => !excludeRecipeIds.includes(r.id))

  function toggleRecipe(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function toggleExpand(id: string) {
    const isExpanded = expandedIds.has(id)
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (isExpanded) next.delete(id)
      else next.add(id)
      return next
    })

    if (!isExpanded && !detailsCache.has(id)) {
      setLoadingDetails((prev) => new Set(prev).add(id))
      try {
        const detail = await getSavedRecipe(id)
        setDetailsCache((prev) => new Map(prev).set(id, detail))
      } catch {
        // Silently fail — user can try expanding again
      } finally {
        setLoadingDetails((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    }
  }

  function mapIngredients(ingredients: SavedRecipeResponse["ingredients"]) {
    return ingredients.map((ing) => ({
      key: ing.id,
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit ? tList(`units.${ing.unit}`) : "",
      categoryLabel: ing.category
        ? `${ing.category.icon ?? ""} ${localizeCategoryName(categoryMap.get(ing.category.id) ?? ing.category)}`.trim()
        : null,
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title ?? t("addRecipeTitle")}</DialogTitle>
          <DialogDescription>{description ?? t("addRecipeDescription")}</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder ?? tList("recipePickerSearch")}
            className="pl-8"
          />
        </div>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-2 min-h-0">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <EmptyState icon={UtensilsCrossed} message={error} variant="error" />
          )}

          {!loading && !error && available.length === 0 && !debouncedSearch && (
            <EmptyState icon={UtensilsCrossed} message={emptyMessage ?? t("addRecipeEmpty")} />
          )}

          {!loading && !error && available.length === 0 && debouncedSearch && (
            <p className="text-center text-sm text-muted-foreground py-8">
              {noSearchResults ?? tList("noSearchResults")}
            </p>
          )}

          {available.map((recipe) => {
            const isSelected = selected.has(recipe.id)
            const isExpanded = expandedIds.has(recipe.id)
            const detail = detailsCache.get(recipe.id)
            const isLoadingDetail = loadingDetails.has(recipe.id)

            return (
              <div
                key={recipe.id}
                className={cn(
                  "rounded-lg border transition-colors",
                  isSelected
                    ? "border-primary/40 bg-primary/5"
                    : "hover:bg-muted/50"
                )}
              >
                <div className="flex w-full items-center gap-3 p-3">
                  <button
                    type="button"
                    onClick={() => toggleRecipe(recipe.id)}
                    className="shrink-0 cursor-pointer"
                  >
                    {isSelected ? (
                      <div className="flex size-5 items-center justify-center rounded border-2 border-primary bg-primary text-primary-foreground">
                        <Check className="size-3" />
                      </div>
                    ) : (
                      <div className="size-5 rounded border-2 border-muted-foreground/40" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleExpand(recipe.id)}
                    className="min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <p className="truncate text-sm font-medium">{recipe.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(recipe.createdAt, locale)}
                    </p>
                  </button>

                  <Badge
                    variant="outline"
                    className={`shrink-0 text-xs ${SOURCE_STYLES[recipe.source] ?? ""}`}
                  >
                    {tSaved(`source.${recipe.source}`)}
                  </Badge>

                  <button
                    type="button"
                    onClick={() => toggleExpand(recipe.id)}
                    className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {isExpanded ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </button>
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 pt-0">
                    <div className="border-t pt-2">
                      {isLoadingDetail && (
                        <div className="flex items-center text-muted-foreground text-xs py-1">
                          <Loader2 className="animate-spin mr-1.5 size-3" />
                          {tList("recipePickerLoading")}
                        </div>
                      )}

                      {detail && (
                        <RecipeDetailContent
                          text={detail.text}
                          ingredients={mapIngredients(detail.ingredients)}
                          ingredientsTitle={detail.text && detail.ingredients.length > 0 ? tSaved("ingredientsTitle") : undefined}
                        />
                      )}

                      {detail && !detail.text && detail.ingredients.length === 0 && (
                        <p className="text-xs text-muted-foreground">—</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {hasMore && <div ref={sentinelRef} />}
          {loadingMore && (
            <div className="flex justify-center py-2">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={adding}
          >
            {cancelLabel ?? t("removeRecipeCancel")}
          </Button>
          <Button
            onClick={() => onAdd(Array.from(selected))}
            disabled={adding || selected.size === 0}
          >
            {adding && <Loader2 className="size-4 animate-spin" />}
            {adding
              ? (confirmingLabel ?? t("addRecipeAdding"))
              : (confirmLabel
                  ? `${confirmLabel} (${selected.size})`
                  : t("addRecipeConfirm", { count: selected.size }))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
