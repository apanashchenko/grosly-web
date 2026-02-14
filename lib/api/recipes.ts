import type {
  ParseRecipeResponse,
  SingleRecipeResponse,
  GeneratedMealPlanResponse,
  SuggestRecipesResponse,
  SaveRecipeRequest,
  SavedRecipeResponse,
  SavedRecipeListItem,
  UpdateRecipeRequest,
  PaginatedResponse,
  PaginationParams,
} from "@/lib/types"
import { request, API_BASE } from "./client"
import { getAccessToken } from "@/lib/auth/storage"
import { streamRequest, type StreamCallbacks } from "./streaming"
import { buildPaginationQuery } from "./utils"

export function parseRecipe(recipeText: string) {
  return request<ParseRecipeResponse>("/recipes/parse", {
    method: "POST",
    body: JSON.stringify({ recipeText }),
  })
}

export async function parseRecipeImage(file: File): Promise<ParseRecipeResponse> {
  const formData = new FormData()
  formData.append("image", file)

  const headers: Record<string, string> = {}
  const token = getAccessToken()
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}/recipes/parse-image`, {
    method: "POST",
    headers,
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const message =
      Array.isArray(errorData?.message)
        ? errorData.message[0]
        : errorData?.message ?? "Something went wrong. Please try again."
    throw new Error(message)
  }

  return response.json()
}

export function generateSingleRecipe(query: string, language: string) {
  return request<SingleRecipeResponse>("/recipes/single", {
    method: "POST",
    body: JSON.stringify({ query, language }),
  })
}

export function generateMealPlan(query: string, language: string) {
  return request<GeneratedMealPlanResponse>("/recipes/meal-plan", {
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

export function updateRecipe(id: string, data: UpdateRecipeRequest) {
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

// Streaming variants

export function streamSingleRecipe(
  query: string,
  language: string,
  callbacks: StreamCallbacks<SingleRecipeResponse>,
  signal?: AbortSignal,
) {
  return streamRequest<SingleRecipeResponse>(
    "/recipes/single/stream",
    { query, language },
    callbacks,
    signal,
  )
}

export function streamMealPlan(
  query: string,
  language: string,
  callbacks: StreamCallbacks<GeneratedMealPlanResponse>,
  signal?: AbortSignal,
) {
  return streamRequest<GeneratedMealPlanResponse>(
    "/recipes/meal-plan/stream",
    { query, language },
    callbacks,
    signal,
  )
}

export function streamSuggestRecipes(
  ingredients: string[],
  language: string,
  callbacks: StreamCallbacks<SuggestRecipesResponse>,
  signal?: AbortSignal,
  strictMode?: boolean,
) {
  return streamRequest<SuggestRecipesResponse>(
    "/recipes/suggest/stream",
    { ingredients, language, ...(strictMode && { strictMode }) },
    callbacks,
    signal,
  )
}
