export type MealPlanRecipeSource = "GENERATED" | "PARSED" | "SUGGESTED" | "MEAL_PLAN"

export interface MealPlanRecipe {
  id: string
  recipeId: string
  recipeTitle: string
  recipeText: string | null
  recipeSource: MealPlanRecipeSource
  recipeShoppingListId: string | null
  dayNumber: number
  position: number
}

export interface MealPlanResponse {
  id: string
  name: string
  numberOfDays: number
  numberOfPeople: number
  shoppingListId: string | null
  recipes: MealPlanRecipe[]
  createdAt: string
  updatedAt: string
}

export interface MealPlanListItem {
  id: string
  name: string
  numberOfDays: number
  numberOfPeople: number
  recipesCount: number
  createdAt: string
}

export interface CreateMealPlanRequest {
  name?: string
  numberOfDays?: number
  numberOfPeople?: number
}

export interface UpdateMealPlanRequest {
  name?: string
  numberOfDays?: number
  numberOfPeople?: number
  shoppingListId?: string | null
  recipes?: string[]
}
