import type { AnalyticsOverviewResponse, AnalyticsParams } from "@/lib/types"
import { request } from "./client"

export function getAnalyticsOverview(params?: AnalyticsParams, spaceId?: string) {
  const searchParams = new URLSearchParams()
  if (params?.topProductsLimit) {
    searchParams.set("topProductsLimit", String(params.topProductsLimit))
  }
  if (params?.period) {
    searchParams.set("period", params.period)
  }
  const query = searchParams.toString()
  const path = `/analytics/overview${query ? `?${query}` : ""}`

  const headers: Record<string, string> | undefined =
    spaceId ? { "X-Space-Id": spaceId } : undefined

  return request<AnalyticsOverviewResponse>(path, { headers })
}
