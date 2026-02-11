export interface Allergy {
  id: string
  name: string
  slug: string
  description: string | null
}

export interface DietaryRestriction {
  id: string
  name: string
  slug: string
  description: string | null
}

export interface UserPreferencesResponse {
  allergies: Allergy[]
  dietaryRestrictions: DietaryRestriction[]
  defaultServings: number
  customNotes: string | null
}

export interface UpdateUserPreferencesRequest {
  allergyIds?: string[]
  dietaryRestrictionIds?: string[]
  defaultServings?: number
  customNotes?: string | null
}
