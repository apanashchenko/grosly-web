import type { AnalyticsOverviewResponse, ActivityPeriod } from "@/lib/types"
import { request } from "./client"

export function getAnalyticsOverview(params?: { period?: ActivityPeriod }, spaceId?: string) {
  const sp = new URLSearchParams()
  if (params?.period) sp.set("period", params.period)
  const q = sp.toString()

  const headers: Record<string, string> | undefined =
    spaceId ? { "X-Space-Id": spaceId } : undefined

  return request<AnalyticsOverviewResponse>(`/analytics/overview${q ? `?${q}` : ""}`, { headers })
}
