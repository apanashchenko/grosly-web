import type { RecipeIngredient, RecipeInstruction } from "@/lib/types"

interface SerializableRecipe {
  dishName: string
  description: string
  cookingTime: number
  ingredients: RecipeIngredient[]
  instructions?: RecipeInstruction[]
}

export function serializeRecipeText(recipe: SerializableRecipe): string {
  const lines: string[] = []

  lines.push(recipe.dishName)
  lines.push("")
  lines.push(recipe.description)
  lines.push("")
  lines.push(`${recipe.cookingTime} min`)
  lines.push("")

  for (const ing of recipe.ingredients) {
    const unit = ing.unit?.localized ?? ""
    lines.push(`- ${ing.name} ${ing.quantity}${unit ? ` ${unit}` : ""}`)
  }

  if (recipe.instructions && recipe.instructions.length > 0) {
    lines.push("")
    for (const inst of recipe.instructions) {
      lines.push(`${inst.step}. ${inst.text}`)
    }
  }

  return lines.join("\n")
}
