interface RecipeDetailIngredient {
  key: string | number
  name: string
  quantity: number | null
  unit: string
  categoryLabel?: string | null
}

interface RecipeDetailContentProps {
  text?: string | null
  ingredients: RecipeDetailIngredient[]
  ingredientsTitle?: string
}

export function RecipeDetailContent({
  text,
  ingredients,
  ingredientsTitle,
}: RecipeDetailContentProps) {
  return (
    <div className="space-y-2">
      {text && (
        <p className="text-xs text-muted-foreground whitespace-pre-line">
          {text}
        </p>
      )}

      {ingredients.length > 0 && ingredientsTitle && (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70 pt-3">
          {ingredientsTitle}
        </p>
      )}

      {ingredients.length > 0 && (
        <div className="divide-y">
          {ingredients.map((ing) => (
            <div
              key={ing.key}
              className="flex items-center gap-2 py-1.5 text-sm text-muted-foreground"
            >
              <span className="min-w-0 flex-1 truncate">{ing.name}</span>
              {(ing.quantity || ing.unit) && (
                <span className="shrink-0 tabular-nums text-xs">
                  {ing.quantity || ""}{ing.quantity && ing.unit ? " " : ""}{ing.unit}
                </span>
              )}
              {ing.categoryLabel && (
                <span className="shrink-0 text-xs">{ing.categoryLabel}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
