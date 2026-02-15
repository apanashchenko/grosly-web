"use client"

import { useState, useEffect } from "react"
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
import { generateMealPlan, streamMealPlan, createMealPlan } from "@/lib/api"
import { useCategories } from "@/hooks/use-categories"
import { useStream } from "@/hooks/use-stream"
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
  const [queryOpen, setQueryOpen] = useState(true)
  const [savingPlan, setSavingPlan] = useState(false)
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null)
  const [includedRecipes, setIncludedRecipes] = useState<Set<number>>(new Set())

  const stream = useStream<GeneratedMealPlanResponse>()
  const { abort } = stream

  useEffect(() => {
    return () => abort()
  }, [abort])

  useEffect(() => {
    if (stream.result) {
      setIncludedRecipes(new Set(stream.result.recipes.map((_, i) => i)))
    }
  }, [stream.result])

  const charCount = query.length
  const isOverLimit = charCount > MAX_LENGTH
  const isSubmitDisabled = charCount < 3 || isOverLimit || stream.isLoading

  function handleGenerate() {
    setSavedPlanId(null)
    stream.start(
      (callbacks, signal) =>
        streamMealPlan(query, locale, callbacks, signal),
      () => generateMealPlan(query, locale),
    )
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
    if (!stream.result || includedRecipes.size === 0) return
    setSavingPlan(true)
    try {
      const selected = stream.result.recipes.filter((_, i) => includedRecipes.has(i))
      const plan = await createMealPlan({
        numberOfDays: stream.result.parsedRequest.numberOfDays,
        numberOfPeople: stream.result.parsedRequest.numberOfPeople,
        ...(stream.result.description && { description: stream.result.description }),
        originalInput: query,
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
    } catch {
      // save error handled silently
    } finally {
      setSavingPlan(false)
    }
  }

  // Use partial data during streaming, full result after done
  const partialRecipes = stream.partial?.recipes ?? []
  const displayRecipes = stream.result?.recipes ?? partialRecipes
  const displayParsedRequest = stream.result?.parsedRequest ?? stream.partial?.parsedRequest

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
                  {stream.error ? (
                    <p className="text-sm text-destructive">{stream.error}</p>
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
                  {stream.isLoading && <LoaderCircle className="animate-spin" />}
                  {stream.isLoading ? t("generating") : t("generateButton")}
                </Button>
                {stream.result && includedRecipes.size > 0 && !savedPlanId && (
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
          {/* Streaming status */}
          {stream.isStreaming && !partialRecipes.length && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-4 animate-pulse text-primary" />
              <span className="animate-pulse">{t("streamingMessage")}</span>
            </div>
          )}

          {/* Parsed request summary */}
          {displayParsedRequest && displayParsedRequest.numberOfPeople && (
            <Card>
              <CardHeader>
                <CardTitle>{t("parsedRequestTitle")}</CardTitle>
                {stream.result && (
                  <CardDescription>
                    {t("recipesFound", { count: stream.result.recipes.length })}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {displayParsedRequest.numberOfPeople && (
                  <Badge>{t("people", { count: displayParsedRequest.numberOfPeople })}</Badge>
                )}
                {displayParsedRequest.numberOfDays && (
                  <Badge>{t("days", { count: displayParsedRequest.numberOfDays })}</Badge>
                )}
                {displayParsedRequest.mealType && (
                  <Badge variant="secondary">
                    {t("mealType", { type: displayParsedRequest.mealType })}
                  </Badge>
                )}
                {displayParsedRequest.dietaryRestrictions && displayParsedRequest.dietaryRestrictions.length > 0 && (
                  <Badge variant="outline">
                    {t("restrictions", {
                      list: displayParsedRequest.dietaryRestrictions.join(", "),
                    })}
                  </Badge>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recipe cards — renders during streaming (partial) and after done (full) */}
          {displayRecipes.map((recipe, index) => (
            recipe.dishName && (
              <RecipeCard
                key={index}
                dishName={recipe.dishName}
                description={recipe.description ?? ""}
                cookingTimeLabel={
                  recipe.cookingTime
                    ? t("cookingTime", { time: recipe.cookingTime })
                    : undefined
                }
                ingredients={recipe.ingredients ?? []}
                instructions={recipe.instructions ?? []}
                instructionsLabel={t("instructionsLabel")}
                defaultOpen={false}
                categoryMap={categoryMap}
                footer={
                  stream.result && !savedPlanId ? (
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
            )
          ))}

          {stream.result && stream.result.recipes.length === 0 && (
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
