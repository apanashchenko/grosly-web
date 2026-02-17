import { setRequestLocale } from "next-intl/server"
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard"

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return <AnalyticsDashboard />
}
