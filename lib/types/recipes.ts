import type { ShoppingListItemRequest } from "./shopping-lists"

export interface IngredientUnit {
  canonical: string
  localized: string
}

export interface ParsedIngredient {
  name: string
  quantity: number | null
  unit: string
  localizedUnit: string
  note: string | null
  categoryId: string | null
}

export interface ParseRecipeResponse {
  ingredients: ParsedIngredient[]
}

export interface RecipeIngredient {
  name: string
  quantity: number
  unit: IngredientUnit
}

export interface GeneratedRecipe {
  dishName: string
  description: string
  ingredients: RecipeIngredient[]
  instructions: RecipeInstruction[]
  cookingTime: number
}

export interface ParsedRequest {
  numberOfPeople: number
  numberOfDays: number
  dietaryRestrictions: string[]
  mealType: string | null
}

export interface SingleRecipeResponse {
  numberOfPeople: number
  recipe: GeneratedRecipe
}

export interface GeneratedMealPlanResponse {
  parsedRequest: ParsedRequest
  recipes: GeneratedRecipe[]
}

/** @deprecated Use SingleRecipeResponse or GeneratedMealPlanResponse */
export type GenerateRecipesResponse = GeneratedMealPlanResponse

export interface RecipeInstruction {
  step: number
  text: string
}

export interface SuggestedRecipe {
  dishName: string
  description: string
  ingredients: RecipeIngredient[]
  instructions: RecipeInstruction[]
  cookingTime: number
  matchedIngredients: string[]
  additionalIngredients: string[]
}

export interface SuggestRecipesResponse {
  suggestedRecipes: SuggestedRecipe[]
}

// --- Saved Recipes ---

export type RecipeSource = "PARSED" | "GENERATED" | "SUGGESTED" | "MANUAL"

export interface SaveRecipeRequest {
  title?: string
  source: RecipeSource
  text: string
  isAddToShoppingList?: boolean
  items?: ShoppingListItemRequest[]
  shoppingListName?: string
}

export interface SavedRecipeMealPlan {
  id: string
  name: string
}

export interface SavedRecipeResponse {
  id: string
  title: string
  source: RecipeSource
  text: string
  shoppingListId: string | null
  mealPlans: SavedRecipeMealPlan[]
  createdAt: string
  updatedAt: string
}

export interface SavedRecipeListItem {
  id: string
  title: string
  source: RecipeSource
  shoppingListId: string | null
  createdAt: string
}

export interface UpdateRecipeRequest {
  title?: string
  text?: string
  isAddToShoppingList?: boolean
  items?: ShoppingListItemRequest[]
  shoppingListName?: string
}
