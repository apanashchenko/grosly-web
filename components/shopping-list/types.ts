export interface ChecklistItem {
  id?: string
  name: string
  badge: string | null
  noteBadge: string | null
  checked: boolean
  rawQuantity?: number
  rawUnit?: string
  rawCategoryId?: string
}

export interface UnitOption {
  value: string
  label: string
}

export interface CategoryOption {
  value: string
  label: string
  icon: string | null
}

export interface ItemData {
  name: string
  quantity: number
  unit: string
  categoryId?: string
}
