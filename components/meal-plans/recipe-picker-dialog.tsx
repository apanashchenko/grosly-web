"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Check, Circle, Loader2, UtensilsCrossed } from "lucide-react"
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
import { EmptyState } from "@/components/shared/empty-state"
import { getSavedRecipes } from "@/lib/api"
import type { SavedRecipeListItem } from "@/lib/types"
import { usePaginatedList } from "@/hooks/use-paginated-list"

const SOURCE_STYLES: Record<string, string> = {
  PARSED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  GENERATED: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
  SUGGESTED: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  MANUAL: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
}

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
  excludeRecipeIds: string[]
}

export function RecipePickerDialog({
  open,
  onOpenChange,
  onAdd,
  adding,
  excludeRecipeIds,
}: RecipePickerDialogProps) {
  const t = useTranslations("MealPlans")
  const tSaved = useTranslations("SavedRecipes")
  const locale = useLocale()

  const [selected, setSelected] = useState<Set<string>>(new Set())

  const {
    items: recipes,
    loading,
    loadingMore,
    error,
    hasMore,
    sentinelRef,
  } = usePaginatedList<SavedRecipeListItem>(
    (params, signal) => getSavedRecipes(params, signal),
    [open],
    t("unexpectedError"),
    { enabled: open },
  )

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) setSelected(new Set())
  }, [open])

  const available = recipes.filter((r) => !excludeRecipeIds.includes(r.id))

  function toggleRecipe(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("addRecipeTitle")}</DialogTitle>
          <DialogDescription>{t("addRecipeDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-2 min-h-0">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <EmptyState icon={UtensilsCrossed} message={error} variant="error" />
          )}

          {!loading && !error && available.length === 0 && (
            <EmptyState icon={UtensilsCrossed} message={t("addRecipeEmpty")} />
          )}

          {available.map((recipe) => {
            const isSelected = selected.has(recipe.id)
            return (
              <button
                key={recipe.id}
                type="button"
                onClick={() => toggleRecipe(recipe.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-left cursor-pointer transition-colors",
                  isSelected
                    ? "border-primary/40 bg-primary/5"
                    : "hover:bg-muted/50"
                )}
              >
                <div className="shrink-0">
                  {isSelected ? (
                    <div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </div>
                  ) : (
                    <Circle className="size-5 text-muted-foreground/40" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{recipe.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(recipe.createdAt, locale)}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`shrink-0 text-xs ${SOURCE_STYLES[recipe.source] ?? ""}`}
                >
                  {tSaved(`source.${recipe.source}`)}
                </Badge>
              </button>
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
            {t("removeRecipeCancel")}
          </Button>
          <Button
            onClick={() => onAdd(Array.from(selected))}
            disabled={adding || selected.size === 0}
          >
            {adding && <Loader2 className="size-4 animate-spin" />}
            {adding
              ? t("addRecipeAdding")
              : t("addRecipeConfirm", { count: selected.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
