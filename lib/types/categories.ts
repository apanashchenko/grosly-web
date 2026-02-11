export interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
  isCustom: boolean
}

export interface CreateCategoryRequest {
  name: string
  icon?: string
}

export interface UpdateCategoryRequest {
  name?: string
  icon?: string
}
