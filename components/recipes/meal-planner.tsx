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
  Bookmark,
  CalendarDays,
  ClipboardList,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  GeneratedMealPlanResponse,
  GeneratedRecipe,
  RecipeIngredient,
} from "@/lib/types"
import {
  generateMealPlan,
  createShoppingList,
  saveRecipe,
  createMealPlan,
  updateMealPlan,
} from "@/lib/api"
import { serializeRecipeText } from "@/components/recipes/serialize-recipe"
import { SaveRecipeDialog } from "@/components/recipes/save-recipe-dialog"
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

export function MealPlanner() {
  const t = useTranslations("MealPlanner")
  const tSave = useTranslations("SavedRecipes")
  const locale = useLocale()

  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GeneratedMealPlanResponse | null>(null)
  const [selectedRecipes, setSelectedRecipes] = useState<Set<number>>(new Set())
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())
  const [queryOpen, setQueryOpen] = useState(true)
  const [savingList, setSavingList] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [savingRecipe, setSavingRecipe] = useState(false)
  const [recipeToSave, setRecipeToSave] = useState<number | null>(null)
  const [savedRecipeIndexes, setSavedRecipeIndexes] = useState<Set<number>>(new Set())

  // Meal plan saving state
  const [savedRecipeIds, setSavedRecipeIds] = useState<Map<number, string>>(new Map())
  const [planRecipes, setPlanRecipes] = useState<Set<number>>(new Set())
  const [savedListId, setSavedListId] = useState<string | null>(null)
  const [includeShoppingList, setIncludeShoppingList] = useState(false)
  const [savingPlan, setSavingPlan] = useState(false)
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null)

  const charCount = query.length
  const isOverLimit = charCount > MAX_LENGTH
  const isSubmitDisabled = charCount < 3 || isOverLimit || isLoading

  const planRecipeCount = planRecipes.size

  async function handleSaveRecipe(opts: {
    title: string
    isAddToShoppingList: boolean
    shoppingListName: string
  }) {
    if (recipeToSave === null || !result) return
    const recipe = result.recipes[recipeToSave]
    if (!recipe) return

    setSavingRecipe(true)
    try {
      const saved = await saveRecipe({
        title: opts.title || undefined,
        source: "GENERATED",
        text: serializeRecipeText(recipe),
        isAddToShoppingList: opts.isAddToShoppingList || undefined,
        ...(opts.isAddToShoppingList
          ? {
              items: recipe.ingredients.map((ing) => ({
                name: ing.name,
                quantity: ing.quantity,
                unit: ing.unit?.canonical ?? "",
              })),
              shoppingListName: opts.shoppingListName || undefined,
            }
          : {}),
      })
      setSavedRecipeIndexes((prev) => new Set(prev).add(recipeToSave))
      setSavedRecipeIds((prev) => new Map(prev).set(recipeToSave, saved.id))
      setPlanRecipes((prev) => new Set(prev).add(recipeToSave))
      setSaveDialogOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError"))
    } finally {
      setSavingRecipe(false)
    }
  }

  async function handleGenerate() {
    setIsLoading(true)
    setError(null)
    setResult(null)
    setSelectedRecipes(new Set())
    setCheckedItems(new Set())
    setSavedSuccess(false)
    setSavedRecipeIndexes(new Set())
    setSavedRecipeIds(new Map())
    setPlanRecipes(new Set())
    setSavedListId(null)
    setIncludeShoppingList(false)
    setSavedPlanId(null)

    try {
      const data = await generateMealPlan(query, locale)
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
    setSavedListId(null)
    setIncludeShoppingList(false)
  }

  function togglePlanRecipe(index: number) {
    setPlanRecipes((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
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
      const list = await createShoppingList({
        items: shoppingList.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit?.canonical ?? "",
        })),
      })
      setSavedSuccess(true)
      setSavedListId(list.id)
      setIncludeShoppingList(true)
    } catch {
      setError(t("unexpectedError"))
    } finally {
      setSavingList(false)
    }
  }

  async function handleSavePlan() {
    if (!result || planRecipeCount === 0) return
    setSavingPlan(true)
    try {
      const recipeIds = Array.from(planRecipes)
        .map((index) => savedRecipeIds.get(index))
        .filter((id): id is string => !!id)

      const plan = await createMealPlan({
        numberOfDays: result.parsedRequest.numberOfDays,
        numberOfPeople: result.parsedRequest.numberOfPeople,
      })

      await updateMealPlan(plan.id, {
        recipes: recipeIds,
        ...(includeShoppingList && savedListId
          ? { shoppingListId: savedListId }
          : {}),
      })

      setSavedPlanId(plan.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError"))
    } finally {
      setSavingPlan(false)
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
            const isSaved = savedRecipeIndexes.has(index)
            const isInPlan = planRecipes.has(index)
            return (
              <RecipeCard
                key={index}
                dishName={recipe.dishName}
                description={recipe.description}
                cookingTimeLabel={t("cookingTime", { time: recipe.cookingTime })}
                ingredients={recipe.ingredients}
                instructions={recipe.instructions}
                instructionsLabel={t("instructionsLabel")}
                defaultOpen={false}
                footer={
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
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
                      {isSaved ? (
                        <Button variant="outline" size="sm" asChild>
                          <Link href="/recipes">
                            <Check className="size-4" />
                            {tSave("recipeSaved")}
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setRecipeToSave(index)
                            setSaveDialogOpen(true)
                          }}
                        >
                          <Bookmark className="size-4" />
                          {tSave("saveRecipe")}
                        </Button>
                      )}
                    </div>
                    {isSaved && !savedPlanId && (
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={isInPlan}
                          onChange={() => togglePlanRecipe(index)}
                          className="size-4 accent-primary"
                        />
                        <CalendarDays className="size-3.5" />
                        {t("includeInPlan")}
                      </label>
                    )}
                  </div>
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
                <div className="space-y-3">
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
                  {savedListId && !savedPlanId && (
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={includeShoppingList}
                        onChange={(e) => setIncludeShoppingList(e.target.checked)}
                        className="size-4 accent-primary"
                      />
                      <CalendarDays className="size-3.5" />
                      {t("includeInPlan")}
                    </label>
                  )}
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

          {/* Save meal plan */}
          {result && planRecipeCount > 0 && !savedPlanId && (
            <Button
              onClick={handleSavePlan}
              disabled={savingPlan}
              className="w-full shadow-md hover:shadow-lg"
              size="lg"
            >
              {savingPlan && <LoaderCircle className="animate-spin" />}
              <ClipboardList className="size-4" />
              {savingPlan
                ? t("savingPlan")
                : t("savePlan", { count: planRecipeCount })}
            </Button>
          )}

          {savedPlanId && (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="gap-1">
                <Check className="size-3" />
                {t("planSaved")}
              </Badge>
              <Button variant="link" size="sm" asChild>
                <Link href={`/meal-plans/${savedPlanId}`}>
                  <ClipboardList className="size-4" />
                  {t("viewMealPlan")}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      <SaveRecipeDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSaveRecipe}
        saving={savingRecipe}
        defaultTitle={
          recipeToSave !== null ? result?.recipes[recipeToSave]?.dishName : ""
        }
        hasItems={
          recipeToSave !== null
            ? (result?.recipes[recipeToSave]?.ingredients.length ?? 0) > 0
            : false
        }
      />
    </main>
  )
}
