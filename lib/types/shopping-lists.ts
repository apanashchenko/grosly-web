export interface ShoppingListItemRequest {
  name: string
  quantity: number
  unit: string
  purchased?: boolean
  categoryId?: string
  position?: number
  note?: string
}

export interface CreateShoppingListRequest {
  name?: string
  label?: string
  items: ShoppingListItemRequest[]
  groupedByCategories?: boolean
}

export interface ItemPosition {
  id: string
  position: number
}

export interface UpdateShoppingListRequest {
  name?: string
  label?: string | null
  isPinned?: boolean
  items?: ShoppingListItemRequest[]
  itemPositions?: ItemPosition[]
  groupedByCategories?: boolean
  spaceId?: string | null
  version?: number
}

export interface CategoryInfo {
  id: string
  name: string
  icon: string | null
}

export interface CreatedByInfo {
  id: string
  name: string
}

export interface ShoppingListItemResponse {
  id: string
  name: string
  quantity: number
  unit: string
  note: string | null
  purchased: boolean
  category: CategoryInfo | null
  position: number
  createdBy: CreatedByInfo | null
}

export interface UpdateShoppingListItemRequest {
  name?: string
  quantity?: number
  unit?: string
  purchased?: boolean
  categoryId?: string
  position?: number
  note?: string
}

export interface ShoppingListResponse {
  id: string
  name: string
  label: string | null
  isPinned: boolean
  spaceId: string | null
  items: ShoppingListItemResponse[]
  groupedByCategories: boolean
  version: number
  createdAt: string
  updatedAt: string
}

export interface CombineShoppingListsRequest {
  name?: string
  listIds: string[]
  groupedByCategories?: boolean
}
