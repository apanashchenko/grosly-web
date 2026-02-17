"use client"

import { useTranslations } from "next-intl"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { useCategoryLocalization } from "@/hooks/use-category-localization"
import type { CategoryDistributionItem } from "@/lib/types"

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

interface CategoryPieChartProps {
  data: CategoryDistributionItem[]
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const t = useTranslations("Analytics")
  const { localizeCategoryName } = useCategoryLocalization()

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("noData")}
      </p>
    )
  }

  const total = data.reduce((sum, item) => sum + item.count, 0)

  const chartData = data.map((item) => {
    const localizedName = item.categoryId
      ? localizeCategoryName({ name: item.categoryName, slug: item.slug ?? undefined })
      : t("uncategorized")

    return {
      ...item,
      label: item.categoryId
        ? `${item.icon ?? ""} ${localizedName}`.trim()
        : t("uncategorized"),
    }
  })

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="count"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          strokeWidth={2}
          stroke="var(--background)"
        >
          {chartData.map((_, index) => (
            <Cell
              key={index}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => {
            const num = Number(value)
            const pct = total > 0 ? ((num / total) * 100).toFixed(1) : "0"
            return [`${num} (${pct}%)`, t("items")]
          }}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--popover)",
            color: "var(--popover-foreground)",
          }}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          iconSize={8}
          formatter={(value: string) => (
            <span className="text-xs text-foreground">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
