"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { BarChart3, Loader2, RefreshCw } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getAnalyticsOverview } from "@/lib/api"
import type { ActivityPeriod, AnalyticsOverviewResponse } from "@/lib/types"
import { TopProductsChart } from "./top-products-chart"
import { CategoryPieChart } from "./category-pie-chart"
import { ActivityChart } from "./activity-chart"

export function AnalyticsDashboard() {
  const t = useTranslations("Analytics")
  const locale = useLocale()

  const [data, setData] = useState<AnalyticsOverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [period, setPeriod] = useState<ActivityPeriod>("week")

  const fetchData = useCallback(async (p: ActivityPeriod) => {
    setLoading(true)
    setLoadError(null)
    try {
      const result = await getAnalyticsOverview({ period: p })
      setData(result)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t("unexpectedError"))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchData(period)
  }, [fetchData, period])

  const activityPeriodLabel = useMemo(() => {
    const firstDate = data?.activity?.[0]?.date
    if (!firstDate) return ""
    const d = new Date(firstDate + "T00:00:00")
    const month = d.toLocaleDateString(locale, { month: "long" })
    const capitalized = month.charAt(0).toUpperCase() + month.slice(1)
    const year = d.getFullYear()
    return `${capitalized} ${year}`
  }, [data?.activity, locale])

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <PageHeader title={t("heading")} subtitle={t("subtitle")} />
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-muted/20 py-20 text-muted-foreground">
          <Loader2 className="mb-4 size-12 animate-spin text-muted-foreground/30" />
          <p className="text-base font-medium">{t("loading")}</p>
        </div>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <PageHeader title={t("heading")} subtitle={t("subtitle")} />
        <EmptyState icon={RefreshCw} message={t("loadError")} variant="error">
          <Button variant="outline" onClick={() => fetchData(period)}>
            <RefreshCw className="size-4" />
            {t("retry")}
          </Button>
        </EmptyState>
      </main>
    )
  }

  const isEmpty =
    !data ||
    (data.topProducts.length === 0 &&
      data.categoriesDistribution.length === 0 &&
      data.activity.every((a) => a.count === 0))

  if (isEmpty) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <PageHeader title={t("heading")} subtitle={t("subtitle")} />
        <EmptyState icon={BarChart3} message={t("noData")} />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader title={t("heading")} subtitle={t("subtitle")} />

      <div className="space-y-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>{t("topProductsTitle")}</CardTitle>
            <CardDescription>{t("topProductsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <TopProductsChart data={data.topProducts} />
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>{t("categoryDistributionTitle")}</CardTitle>
            <CardDescription>{t("categoryDistributionDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={data.categoriesDistribution} />
          </CardContent>
        </Card>

        {/* Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("activityTitle")}</CardTitle>
                <CardDescription>
                  {activityPeriodLabel}
                </CardDescription>
              </div>
              <div className="flex gap-1 rounded-lg border border-border p-0.5">
                <Button
                  variant={period === "week" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => setPeriod("week")}
                >
                  {t("groupByWeek")}
                </Button>
                <Button
                  variant={period === "month" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => setPeriod("month")}
                >
                  {t("groupByMonth")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ActivityChart data={data.activity} period={period} />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
