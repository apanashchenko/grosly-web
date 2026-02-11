import type {
  ParseRecipeResponse,
  GenerateRecipesResponse,
  SuggestRecipesResponse,
} from "@/lib/types"
import { request } from "./client"

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
