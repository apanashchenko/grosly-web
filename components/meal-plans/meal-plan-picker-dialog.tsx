"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  CalendarDays,
  ClipboardList,
  Loader2,
  Users,
  UtensilsCrossed,
} from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/empty-state"
import { getMealPlan, getMealPlans, updateMealPlan } from "@/lib/api"
import type { MealPlanListItem } from "@/lib/types"
import { usePaginatedList } from "@/hooks/use-paginated-list"

function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(new Date(iso))
}

interface MealPlanPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipeId: string
  excludePlanIds?: string[]
  onAdded?: () => void
}

export function MealPlanPickerDialog({
  open,
  onOpenChange,
  recipeId,
  excludePlanIds = [],
  onAdded,
}: MealPlanPickerDialogProps) {
  const t = useTranslations("MealPlans")
  const locale = useLocale()

  const [addingToPlanId, setAddingToPlanId] = useState<string | null>(null)

  const {
    items: plans,
    loading,
    loadingMore,
    error,
    hasMore,
    sentinelRef,
  } = usePaginatedList<MealPlanListItem>(
    (params, signal) => getMealPlans(params, signal),
    [open],
    t("unexpectedError"),
  )

  async function handleSelectPlan(planId: string) {
    setAddingToPlanId(planId)
    try {
      const plan = await getMealPlan(planId)
      const existing = plan.recipes.map((r) => ({ recipeId: r.recipeId, dayNumber: r.dayNumber }))
      await updateMealPlan(planId, {
        recipes: [...existing, { recipeId }],
      })
      toast.success(t("addedToPlanToast"))
      onOpenChange(false)
      onAdded?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("unexpectedError")
      toast.error(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setAddingToPlanId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("addToMealPlanTitle")}</DialogTitle>
          <DialogDescription>{t("addToMealPlanDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-2 min-h-0">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <EmptyState icon={ClipboardList} message={error} variant="error" />
          )}

          {(() => {
            const available = plans.filter((p) => !excludePlanIds.includes(p.id))
            return (
              <>
                {!loading && !error && available.length === 0 && (
                  <EmptyState icon={ClipboardList} message={t("addToMealPlanEmpty")} />
                )}

                {available.map((plan) => {
            const isAdding = addingToPlanId === plan.id
            return (
              <button
                key={plan.id}
                type="button"
                disabled={addingToPlanId !== null}
                onClick={() => handleSelectPlan(plan.id)}
                className="w-full text-left rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{plan.name}</p>
                    {plan.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {plan.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(plan.createdAt, locale)}
                      </span>
                      {!isAdding && (
                        <>
                          <Badge variant="outline" className="gap-1 text-xs">
                            <CalendarDays className="size-3" />
                            {t("days", { count: plan.numberOfDays })}
                          </Badge>
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Users className="size-3" />
                            {t("people", { count: plan.numberOfPeople })}
                          </Badge>
                          <Badge variant="outline" className="gap-1 text-xs">
                            <UtensilsCrossed className="size-3" />
                            {t("recipesCount", { count: plan.recipesCount })}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                  {isAdding && (
                    <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                  )}
                </div>
              </button>
            )
          })}
              </>
            )
          })()}

          {hasMore && <div ref={sentinelRef} />}
          {loadingMore && (
            <div className="flex justify-center py-2">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
