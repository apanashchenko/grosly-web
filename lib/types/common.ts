export const UNITS = ["pcs", "g", "kg", "ml", "l", "tbsp", "tsp", "cup", "cm"] as const

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    itemsPerPage: number
    cursor: string
  }
  links: {
    current: string
    next: string
    previous: string
  }
}

export interface PaginationParams {
  limit?: number
  cursor?: string
  sortBy?: string
}
