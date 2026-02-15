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
  recipeText?: string
}

export interface RecipeIngredient {
  name: string
  quantity: number
  unit: IngredientUnit
  categoryId: string | null
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
  description: string | null
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

export type RecipeSource = "PARSED" | "PARSED_IMAGE" | "GENERATED" | "SUGGESTED" | "MANUAL" | "MEAL_PLAN"

export interface RecipeIngredientInput {
  name: string
  quantity: number
  unit: string
  categoryId?: string
  note?: string
}

export interface RecipeIngredientResponse {
  id: string
  name: string
  quantity: number
  unit: string
  note: string | null
  category: { id: string; name: string; slug: string; icon: string | null } | null
  position: number
}

export interface SaveRecipeRequest {
  title?: string
  source: RecipeSource
  text: string
  originalInput?: string
  ingredients?: RecipeIngredientInput[]
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
  originalInput: string | null
  ingredients: RecipeIngredientResponse[]
  mealPlans: SavedRecipeMealPlan[]
  createdAt: string
  updatedAt: string
}

export interface SavedRecipeListItem {
  id: string
  title: string
  source: RecipeSource
  createdAt: string
}

export interface UpdateRecipeRequest {
  title?: string
  text?: string
  ingredients?: RecipeIngredientInput[]
}

export interface UpdateRecipeIngredientRequest {
  name?: string
  quantity?: number
  unit?: string
  categoryId?: string | null
  note?: string | null
}
