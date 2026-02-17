"use client"

import { useLocale, useTranslations } from "next-intl"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import type { ActivityEntry, ActivityPeriod } from "@/lib/types"

interface ActivityChartProps {
  data: ActivityEntry[]
  period: ActivityPeriod
}

const DAY_NAMES_UK = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"]
const DAY_NAMES_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function formatDate(date: string, period: ActivityPeriod, locale: string): string {
  const d = new Date(date + "T00:00:00")

  if (period === "month") {
    return String(d.getDate())
  }

  // Week mode: "2026-02-17" → "Пн 17"
  const jsDay = d.getDay()
  const isoDay = jsDay === 0 ? 6 : jsDay - 1 // Mon=0..Sun=6
  const dayNames = locale === "uk" ? DAY_NAMES_UK : DAY_NAMES_EN
  return `${dayNames[isoDay]} ${d.getDate()}`
}

export function ActivityChart({ data, period }: ActivityChartProps) {
  const t = useTranslations("Analytics")
  const locale = useLocale()

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("noData")}
      </p>
    )
  }

  const chartData = data.map((item) => ({
    ...item,
    label: formatDate(item.date, period, locale),
  }))

  const minWidth = data.length > 10 ? data.length * 32 : undefined

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth }}>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 12, left: -12, bottom: 0 }}
          >
            <defs>
              <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="label"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value) => [
                t("totalLists", { count: Number(value) }),
                "",
              ]}
              labelFormatter={(label) => String(label)}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--popover)",
                color: "var(--popover-foreground)",
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="url(#activityGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
