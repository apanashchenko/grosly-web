"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  ChevronDown,
  LoaderCircle,
  Check,
  Sparkles,
  ClipboardList,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { GeneratedMealPlanResponse } from "@/lib/types"
import { generateMealPlan, createMealPlan } from "@/lib/api"
import { useCategories } from "@/hooks/use-categories"
import { serializeRecipeText } from "@/components/recipes/serialize-recipe"
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

const MAX_LENGTH = 500

export function MealPlanner() {
  const t = useTranslations("MealPlanner")
  const locale = useLocale()
  const { categoryMap } = useCategories()

  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GeneratedMealPlanResponse | null>(null)
  const [queryOpen, setQueryOpen] = useState(true)
  const [savingPlan, setSavingPlan] = useState(false)
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null)
  const [includedRecipes, setIncludedRecipes] = useState<Set<number>>(new Set())

  const charCount = query.length
  const isOverLimit = charCount > MAX_LENGTH
  const isSubmitDisabled = charCount < 3 || isOverLimit || isLoading

  async function handleGenerate() {
    setIsLoading(true)
    setError(null)
    setResult(null)
    setSavedPlanId(null)

    try {
      const data = await generateMealPlan(query, locale)
      setResult(data)
      setIncludedRecipes(new Set(data.recipes.map((_, i) => i)))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError"))
    } finally {
      setIsLoading(false)
    }
  }

  function toggleRecipe(index: number) {
    setIncludedRecipes((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  async function handleSavePlan() {
    if (!result || includedRecipes.size === 0) return
    setSavingPlan(true)
    try {
      const selected = result.recipes.filter((_, i) => includedRecipes.has(i))
      const plan = await createMealPlan({
        numberOfDays: result.parsedRequest.numberOfDays,
        numberOfPeople: result.parsedRequest.numberOfPeople,
        ...(result.description && { description: result.description }),
        recipes: selected.map((recipe) => ({
          title: recipe.dishName,
          source: "GENERATED" as const,
          text: serializeRecipeText(recipe),
          ingredients: recipe.ingredients.map((ing) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit?.canonical ?? "",
            ...(ing.categoryId && { categoryId: ing.categoryId }),
          })),
        })),
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
              <CardFooter className="flex-wrap gap-2">
                <Button onClick={handleGenerate} disabled={isSubmitDisabled}>
                  {isLoading && <LoaderCircle className="animate-spin" />}
                  {isLoading ? t("generating") : t("generateButton")}
                </Button>
                {result && includedRecipes.size > 0 && !savedPlanId && (
                  <Button
                    onClick={handleSavePlan}
                    disabled={savingPlan}
                    variant="outline"
                  >
                    {savingPlan && <LoaderCircle className="animate-spin" />}
                    <ClipboardList className="size-4" />
                    {savingPlan
                      ? t("savingPlan")
                      : t("savePlanButton", { count: includedRecipes.size })}
                  </Button>
                )}
                {savedPlanId && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/meal-plans/${savedPlanId}`}>
                      <Check className="size-4" />
                      {t("planSaved")}
                    </Link>
                  </Button>
                )}
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
          {result?.recipes.map((recipe, index) => (
            <RecipeCard
              key={index}
              dishName={recipe.dishName}
              description={recipe.description}
              cookingTimeLabel={t("cookingTime", { time: recipe.cookingTime })}
              ingredients={recipe.ingredients}
              instructions={recipe.instructions}
              instructionsLabel={t("instructionsLabel")}
              defaultOpen={false}
              categoryMap={categoryMap}
              footer={
                !savedPlanId ? (
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={includedRecipes.has(index)}
                      onChange={() => toggleRecipe(index)}
                      className="size-4 accent-primary"
                    />
                    {t("includeInPlan")}
                  </label>
                ) : undefined
              }
            />
          ))}

          {result && result.recipes.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-muted/20 px-4 py-16">
              <Sparkles className="mb-4 size-12 text-muted-foreground/40" />
              <p className="text-center text-sm font-medium text-muted-foreground">
                {t("noRecipes")}
              </p>
            </div>
          )}

        </div>
      </div>

    </main>
  )
}
