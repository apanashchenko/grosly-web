export type MealPlanRecipeSource = "GENERATED" | "PARSED" | "SUGGESTED" | "MEAL_PLAN"

export interface MealPlanRecipeIngredient {
  id: string
  name: string
  quantity: number
  unit: string
  category: { id: string; name: string; slug: string; icon: string | null } | null
  position: number
}

export interface MealPlanRecipe {
  id: string
  recipeId: string
  recipeTitle: string
  recipeText: string | null
  recipeSource: MealPlanRecipeSource
  ingredients: MealPlanRecipeIngredient[]
  dayNumber: number
  position: number
}

export interface MealPlanResponse {
  id: string
  name: string
  description: string | null
  numberOfDays: number
  numberOfPeople: number
  originalInput: string | null
  recipes: MealPlanRecipe[]
  createdAt: string
  updatedAt: string
}

export interface MealPlanListItem {
  id: string
  name: string
  description: string | null
  numberOfDays: number
  numberOfPeople: number
  recipesCount: number
  createdAt: string
}

export interface CreateMealPlanRecipeInput {
  title: string
  source: MealPlanRecipeSource
  text: string
  ingredients?: { name: string; quantity: number; unit: string; categoryId?: string }[]
}

export interface CreateMealPlanRequest {
  name?: string
  description?: string
  numberOfDays?: number
  numberOfPeople?: number
  originalInput?: string
  recipes?: CreateMealPlanRecipeInput[]
}

export interface UpdateMealPlanRequest {
  name?: string
  description?: string | null
  numberOfDays?: number
  numberOfPeople?: number
  recipes?: string[]
}
