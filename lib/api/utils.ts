import type { PaginationParams } from "@/lib/types"

export function buildPaginationQuery(params?: PaginationParams): string {
  if (!params) return ""
  const searchParams = new URLSearchParams()
  if (params.limit) searchParams.set("limit", String(params.limit))
  if (params.cursor) searchParams.set("cursor", params.cursor)
  if (params.sortBy) searchParams.set("sortBy", params.sortBy)
  if (params.search) searchParams.set("search", params.search)
  if (params.filter) {
    for (const [key, value] of Object.entries(params.filter)) {
      searchParams.set(`filter.${key}`, value)
    }
  }
  const qs = searchParams.toString()
  return qs ? `?${qs}` : ""
}
