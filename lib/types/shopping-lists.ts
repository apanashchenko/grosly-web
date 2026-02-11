export interface ShoppingListItemRequest {
  name: string
  quantity: number
  unit: string
  purchased?: boolean
  categoryId?: string
  position?: number
}

export interface CreateShoppingListRequest {
  name?: string
  items: ShoppingListItemRequest[]
}

export interface ItemPosition {
  id: string
  position: number
}

export interface UpdateShoppingListRequest {
  name?: string
  items?: ShoppingListItemRequest[]
  itemPositions?: ItemPosition[]
  groupedByCategories?: boolean
}

export interface CategoryInfo {
  id: string
  name: string
  icon: string | null
}

export interface ShoppingListItemResponse {
  id: string
  name: string
  quantity: number
  unit: string
  purchased: boolean
  category: CategoryInfo | null
  position: number
}

export interface UpdateShoppingListItemRequest {
  name?: string
  quantity?: number
  unit?: string
  purchased?: boolean
  categoryId?: string
  position?: number
}

export interface ShoppingListResponse {
  id: string
  name: string
  items: ShoppingListItemResponse[]
  groupedByCategories: boolean
  createdAt: string
  updatedAt: string
}
