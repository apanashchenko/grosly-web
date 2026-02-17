export interface TopProduct {
  name: string
  count: number
}

export interface CategoryDistributionItem {
  categoryId: string | null
  categoryName: string
  slug: string | null
  icon: string | null
  count: number
}

export interface ActivityEntry {
  date: string
  count: number
}

export type ActivityPeriod = "week" | "month"

export interface AnalyticsOverviewResponse {
  topProducts: TopProduct[]
  categoriesDistribution: CategoryDistributionItem[]
  activity: ActivityEntry[]
}

export interface AnalyticsParams {
  topProductsLimit?: number
  period?: ActivityPeriod
}
