import type {
  ParseRecipeResponse,
  GenerateRecipesResponse,
  SuggestRecipesResponse,
  SaveRecipeRequest,
  SavedRecipeResponse,
  SavedRecipeListItem,
  UpdateRecipeTitleRequest,
  PaginatedResponse,
  PaginationParams,
} from "@/lib/types"
import { request } from "./client"
import { buildPaginationQuery } from "./utils"

export function parseRecipe(recipeText: string) {
  return request<ParseRecipeResponse>("/recipes/parse", {
    method: "POST",
    body: JSON.stringify({ recipeText }),
  })
}

export function generateRecipes(query: string, language: string) {
  return request<GenerateRecipesResponse>("/recipes/generate", {
    method: "POST",
    body: JSON.stringify({ query, language }),
  })
}

export function suggestRecipes(
  ingredients: string[],
  language: string,
  strictMode?: boolean
) {
  return request<SuggestRecipesResponse>("/recipes/suggest", {
    method: "POST",
    body: JSON.stringify({ ingredients, language, strictMode }),
  })
}

export function saveRecipe(data: SaveRecipeRequest) {
  return request<SavedRecipeResponse>("/recipes", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export function getSavedRecipes(params?: PaginationParams, signal?: AbortSignal) {
  const qs = buildPaginationQuery(params)
  return request<PaginatedResponse<SavedRecipeListItem>>(`/recipes${qs}`, { signal })
}

export function getSavedRecipe(id: string) {
  return request<SavedRecipeResponse>(`/recipes/${encodeURIComponent(id)}`)
}

export function updateRecipeTitle(id: string, data: UpdateRecipeTitleRequest) {
  return request<SavedRecipeResponse>(`/recipes/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export function deleteSavedRecipe(id: string) {
  return request<void>(`/recipes/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}
