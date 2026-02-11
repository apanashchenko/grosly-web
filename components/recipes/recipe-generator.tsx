"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  ChevronDown,
  LoaderCircle,
  ShoppingCart,
  Check,
  Plus,
  Minus,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  GenerateRecipesResponse,
  GeneratedRecipe,
  RecipeIngredient,
} from "@/lib/types"
import { generateRecipes, createShoppingList } from "@/lib/api"
import { PageHeader } from "@/components/shared/page-header"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { RecipeCard } from "@/components/recipes/recipe-card"
import { ShoppingListCard } from "@/components/shopping-list/shopping-list-card"

const MAX_LENGTH = 500

function mergeIngredients(recipes: GeneratedRecipe[]): RecipeIngredient[] {
  const map = new Map<string, RecipeIngredient>()
  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      const key = `${ing.name}__${ing.unit?.canonical ?? "none"}`
      const existing = map.get(key)
      if (existing) {
        map.set(key, { ...existing, quantity: existing.quantity + ing.quantity })
      } else {
        map.set(key, { ...ing })
      }
    }
  }
  return Array.from(map.values())
}

export function RecipeGenerator() {
  const t = useTranslations("RecipeGenerator")
  const locale = useLocale()

  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateRecipesResponse | null>(null)
  const [selectedRecipes, setSelectedRecipes] = useState<Set<number>>(new Set())
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())
  const [queryOpen, setQueryOpen] = useState(true)
  const [savingList, setSavingList] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const charCount = query.length
  const isOverLimit = charCount > MAX_LENGTH
  const isSubmitDisabled = charCount < 3 || isOverLimit || isLoading

  async function handleGenerate() {
    setIsLoading(true)
    setError(null)
    setResult(null)
    setSelectedRecipes(new Set())
    setCheckedItems(new Set())
    setSavedSuccess(false)

    try {
      const data = await generateRecipes(query, locale)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError"))
    } finally {
      setIsLoading(false)
    }
  }

  function toggleRecipe(index: number) {
    setSelectedRecipes((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
    setCheckedItems(new Set())
    setSavedSuccess(false)
  }

  const selectedRecipesList = result
    ? result.recipes.filter((_, i) => selectedRecipes.has(i))
    : []
  const shoppingList =
    selectedRecipesList.length > 0 ? mergeIngredients(selectedRecipesList) : null

  async function handleSaveList() {
    if (!shoppingList) return
    setSavingList(true)
    try {
      await createShoppingList({
        items: shoppingList.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit?.localized ?? "",
        })),
      })
      setSavedSuccess(true)
    } catch {
      setError(t("unexpectedError"))
    } finally {
      setSavingList(false)
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <PageHeader title={t("heading")} subtitle={t("subtitle")} />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Left column — query input */}
        <Card>
          <CardHeader>
            <CardTitle>{t("queryTitle")}</CardTitle>
            <CardDescription>{t("queryDescription")}</CardDescription>
            <CardAction>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQueryOpen((v) => !v)}
              >
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    queryOpen && "rotate-180"
                  )}
                />
              </Button>
            </CardAction>
          </CardHeader>
          {queryOpen && (
            <>
              <CardContent className="space-y-2">
                <Textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("placeholder")}
                  rows={4}
                  className="min-h-[120px] resize-y"
                />
                <div className="flex items-center justify-between">
                  {error ? (
                    <p className="text-sm text-destructive">{error}</p>
                  ) : (
                    <span />
                  )}
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      isOverLimit
                        ? "font-medium text-destructive"
                        : "text-muted-foreground"
                    )}
                  >
                    {charCount}/{MAX_LENGTH}
                  </span>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleGenerate} disabled={isSubmitDisabled}>
                  {isLoading && <LoaderCircle className="animate-spin" />}
                  {isLoading ? t("generating") : t("generateButton")}
                </Button>
              </CardFooter>
            </>
          )}
        </Card>

        {/* Right column — results */}
        <div className="space-y-6">
          {/* Parsed request summary */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle>{t("parsedRequestTitle")}</CardTitle>
                <CardDescription>
                  {t("recipesFound", { count: result.recipes.length })}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Badge>{t("people", { count: result.parsedRequest.numberOfPeople })}</Badge>
                <Badge>{t("days", { count: result.parsedRequest.numberOfDays })}</Badge>
                {result.parsedRequest.mealType && (
                  <Badge variant="secondary">
                    {t("mealType", { type: result.parsedRequest.mealType })}
                  </Badge>
                )}
                {result.parsedRequest.dietaryRestrictions.length > 0 && (
                  <Badge variant="outline">
                    {t("restrictions", {
                      list: result.parsedRequest.dietaryRestrictions.join(", "),
                    })}
                  </Badge>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recipe cards */}
          {result?.recipes.map((recipe, index) => {
            const isSelected = selectedRecipes.has(index)
            return (
              <RecipeCard
                key={index}
                dishName={recipe.dishName}
                description={recipe.description}
                cookingTimeLabel={t("cookingTime", { time: recipe.cookingTime })}
                ingredients={recipe.ingredients}
                defaultOpen={false}
                footer={
                  <Button
                    variant={isSelected ? "secondary" : "default"}
                    onClick={() => toggleRecipe(index)}
                  >
                    {isSelected ? (
                      <Minus className="size-4" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    {isSelected ? t("removeFromCart") : t("addToCart")}
                  </Button>
                }
              />
            )
          })}

          {result && result.recipes.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-muted/20 px-4 py-16">
              <Sparkles className="mb-4 size-12 text-muted-foreground/40" />
              <p className="text-center text-sm font-medium text-muted-foreground">
                {t("noRecipes")}
              </p>
            </div>
          )}

          {/* Shopping list from selected recipes */}
          {shoppingList && (
            <div className="space-y-4">
              <ShoppingListCard
                title={t("shoppingListTitle")}
                description={t("purchased", {
                  checked: checkedItems.size,
                  total: shoppingList.length,
                })}
                items={shoppingList.map((ing, index) => ({
                  name: ing.name,
                  badge: ing.unit
                    ? `${ing.quantity} ${ing.unit.localized}`
                    : `${ing.quantity}`,
                  noteBadge: null,
                  checked: checkedItems.has(index),
                }))}
                onToggleItem={(index) => {
                  setCheckedItems((prev) => {
                    const next = new Set(prev)
                    if (next.has(index)) next.delete(index)
                    else next.add(index)
                    return next
                  })
                }}
              />
              {savedSuccess ? (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="gap-1">
                    <Check className="size-3" />
                    {t("savedSuccess")}
                  </Badge>
                  <Button variant="link" size="sm" asChild>
                    <Link href="/shopping-list">
                      <ShoppingCart className="size-4" />
                      {t("viewShoppingLists")}
                    </Link>
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleSaveList}
                  disabled={savingList}
                  className="w-full shadow-md hover:shadow-lg"
                  size="lg"
                >
                  {savingList && <LoaderCircle className="animate-spin" />}
                  <ShoppingCart className="size-4" />
                  {savingList ? t("saving") : t("saveShoppingList")}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
