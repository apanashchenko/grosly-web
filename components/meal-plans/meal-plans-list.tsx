"use client"

import { useLocale, useTranslations } from "next-intl"
import {
  CalendarDays,
  ClipboardList,
  Loader2,
  Plus,
  RefreshCw,
  Users,
  UtensilsCrossed,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Link } from "@/i18n/navigation"
import { getMealPlans } from "@/lib/api"
import type { MealPlanListItem } from "@/lib/types"
import { usePaginatedList } from "@/hooks/use-paginated-list"

function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

export function MealPlansList() {
  const t = useTranslations("MealPlans")
  const locale = useLocale()

  const {
    items: plans,
    loading,
    loadingMore,
    error: loadError,
    hasMore,
    reset: resetPlans,
    sentinelRef,
  } = usePaginatedList<MealPlanListItem>(
    (params, signal) => getMealPlans(params, signal),
    [],
    t("unexpectedError"),
  )

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader title={t("heading")} subtitle={t("subtitle")} />

      <div className="mb-6 flex justify-end">
        <Button asChild>
          <Link href="/meal-plans/new">
            <Plus className="size-4" />
            {t("createButton")}
          </Link>
        </Button>
      </div>

      <div className="space-y-4">
        {loading && (
          <EmptyState icon={Loader2} message={t("loading")} />
        )}

        {loadError && (
          <EmptyState icon={RefreshCw} message={t("loadError")} variant="error">
            <Button variant="outline" size="sm" onClick={resetPlans}>
              {t("retry")}
            </Button>
          </EmptyState>
        )}

        {!loading && !loadError && plans.length === 0 && (
          <EmptyState icon={ClipboardList} message={t("emptyPlans")} />
        )}

        {plans.map((plan) => (
          <Link
            key={plan.id}
            href={`/meal-plans/${plan.id}`}
            className="block"
          >
            <Card className="transition-shadow hover:shadow-md hover:border-primary/20">
              <CardHeader>
                <CardTitle className="truncate text-base">
                  {plan.name}
                </CardTitle>
                {plan.description && (
                  <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                    {plan.description}
                  </p>
                )}
                <CardDescription className="mt-0.5">
                  {t("createdAt", {
                    date: formatDate(plan.createdAt, locale),
                  })}
                </CardDescription>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
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
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}

        {hasMore && <div ref={sentinelRef} />}
        {loadingMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </main>
  )
}
