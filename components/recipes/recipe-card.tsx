"use client"

import { useState } from "react"
import { ChevronDown, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RecipeIngredient, RecipeInstruction, Category } from "@/lib/types"
import { useCategoryLocalization } from "@/hooks/use-category-localization"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface Props {
  dishName: string
  description: string
  cookingTimeLabel: string
  ingredients: RecipeIngredient[]
  instructions?: RecipeInstruction[]
  instructionsLabel?: string
  footer?: React.ReactNode
  defaultOpen?: boolean
  highlightIngredients?: string[]
  categoryMap?: Map<string, Category>
}

export function RecipeCard({
  dishName,
  description,
  cookingTimeLabel,
  ingredients,
  instructions,
  instructionsLabel,
  footer,
  defaultOpen = true,
  highlightIngredients,
  categoryMap,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const { localizeCategoryName } = useCategoryLocalization()

  const highlightSet = highlightIngredients
    ? new Set(highlightIngredients.map((i) => i.toLowerCase()))
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dishName}</CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          {description}
          <Badge variant="outline" className="gap-1 bg-primary/5 border-primary/20 text-primary">
            <Clock className="size-3" />
            {cookingTimeLabel}
          </Badge>
        </CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen((v) => !v)}
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                open && "rotate-180"
              )}
            />
          </Button>
        </CardAction>
      </CardHeader>
      {open && (
        <>
          <CardContent>
            <div className="divide-y">
              {ingredients.map((ingredient, index) => {
                const isHighlighted =
                  highlightSet?.has(ingredient.name.toLowerCase()) ?? false
                const qty = ingredient.unit
                  ? `${ingredient.quantity} ${ingredient.unit.localized}`
                  : `${ingredient.quantity}`
                const category = ingredient.categoryId
                  ? categoryMap?.get(ingredient.categoryId)
                  : undefined
                return (
                  <div
                    key={index}
                    className="flex items-baseline gap-2 py-3"
                  >
                    <span
                      className={cn(
                        "min-w-0 flex-1 font-medium truncate",
                        isHighlighted && "text-primary bg-primary/10 px-1 rounded"
                      )}
                    >
                      {ingredient.name}
                    </span>
                    <Badge variant="secondary" className="shrink-0">{qty}</Badge>
                    {category && (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {category.icon ? `${category.icon} ` : ""}
                        {localizeCategoryName(category)}
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
            {instructions && instructions.length > 0 && (
              <div className="mt-4">
                {instructionsLabel && (
                  <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
                    {instructionsLabel}
                  </h4>
                )}
                <ol className="list-none space-y-2">
                  {instructions.map((instruction) => (
                    <li key={instruction.step} className="flex gap-3 py-1">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {instruction.step}
                      </span>
                      <span className="text-sm leading-relaxed">
                        {instruction.text}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
          {footer && <CardFooter>{footer}</CardFooter>}
        </>
      )}
    </Card>
  )
}
