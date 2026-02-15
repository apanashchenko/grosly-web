"use client"

import { useState, useEffect, useRef } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  ChevronDown,
  LoaderCircle,
  Check,
  Sparkles,
  ClipboardList,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { UNITS, type GeneratedMealPlanResponse, type GeneratedRecipe, type RecipeIngredient } from "@/lib/types"
import { generateMealPlan, streamMealPlan, createMealPlan } from "@/lib/api"
import { useCategories } from "@/hooks/use-categories"
import { useCategoryLocalization } from "@/hooks/use-category-localization"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { RecipeCard } from "@/components/recipes/recipe-card"

const MAX_LENGTH = 500

export function MealPlanner() {
  const t = useTranslations("MealPlanner")
  const tList = useTranslations("ShoppingList")
  const locale = useLocale()
  const { categories, categoryMap } = useCategories()
  const { localizeCategoryName } = useCategoryLocalization()

  const [query, setQuery] = useState("")
  const [queryOpen, setQueryOpen] = useState(true)
  const [savingPlan, setSavingPlan] = useState(false)
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [planName, setPlanName] = useState("")
  // dayNumber → Set of selected recipe indexes within that day
  const [selectedRecipes, setSelectedRecipes] = useState<Map<number, Set<number>>>(new Map())
  // "dayNumber-recipeIndex" → edited recipe
  const [editedRecipes, setEditedRecipes] = useState<Map<string, GeneratedRecipe>>(new Map())

  const stream = useStream<GeneratedMealPlanResponse>()
  const { abort } = stream

  useEffect(() => {
    return () => abort()
  }, [abort])

  // Auto-select all recipes when stream finishes
  useEffect(() => {
    if (stream.result) {
      const allSelected = new Map<number, Set<number>>()
      for (const day of stream.result.days) {
        allSelected.set(day.dayNumber, new Set(day.recipes.map((_, i) => i)))
      }
      setSelectedRecipes(allSelected)
      setEditedRecipes(new Map())
    }
  }, [stream.result])

  const charCount = query.length
  const isOverLimit = charCount > MAX_LENGTH
  const isSubmitDisabled = charCount < 3 || isOverLimit || stream.isLoading

  function recipeKey(dayNumber: number, recipeIndex: number) {
    return `${dayNumber}-${recipeIndex}`
  }

  function getEditedRecipe(dayNumber: number, recipeIndex: number, original: GeneratedRecipe): GeneratedRecipe {
    return editedRecipes.get(recipeKey(dayNumber, recipeIndex)) ?? original
  }

  function updateRecipe(dayNumber: number, recipeIndex: number, original: GeneratedRecipe, updater: (r: GeneratedRecipe) => GeneratedRecipe) {
    const key = recipeKey(dayNumber, recipeIndex)
    setEditedRecipes((prev) => {
      const next = new Map(prev)
      const current = next.get(key) ?? structuredClone(original)
      next.set(key, updater(current))
      return next
    })
  }

  function isRecipeSelected(dayNumber: number, recipeIndex: number) {
    return selectedRecipes.get(dayNumber)?.has(recipeIndex) ?? false
  }

  function toggleRecipe(dayNumber: number, recipeIndex: number) {
    setSelectedRecipes((prev) => {
      const next = new Map(prev)
      const daySet = new Set(next.get(dayNumber) ?? [])
      if (daySet.has(recipeIndex)) {
        daySet.delete(recipeIndex)
      } else {
        daySet.add(recipeIndex)
      }
      next.set(dayNumber, daySet)
      return next
    })
  }

  function toggleDay(dayNumber: number, totalRecipes: number) {
    setSelectedRecipes((prev) => {
      const next = new Map(prev)
      const daySet = next.get(dayNumber)
      const allSelected = daySet?.size === totalRecipes
      if (allSelected) {
        next.set(dayNumber, new Set())
      } else {
        next.set(dayNumber, new Set(Array.from({ length: totalRecipes }, (_, i) => i)))
      }
      return next
    })
  }

  // Total count of selected recipes across all days
  const totalSelectedCount = Array.from(selectedRecipes.values()).reduce((sum, s) => sum + s.size, 0)

  function handleGenerate() {
    setSavedPlanId(null)
    setEditedRecipes(new Map())
    setSelectedRecipes(new Map())
    stream.start(
      (callbacks, signal) =>
        streamMealPlan(query, locale, callbacks, signal),
      () => generateMealPlan(query, locale),
    )
  }

  async function handleSavePlan() {
    if (!stream.result || totalSelectedCount === 0) return
    setSavingPlan(true)
    try {
      const recipes: { recipe: GeneratedRecipe; dayNumber: number }[] = []
      for (const day of stream.result.days) {
        const daySelected = selectedRecipes.get(day.dayNumber)
        if (!daySelected) continue
        for (const ri of daySelected) {
          if (day.recipes[ri]) {
            recipes.push({
              recipe: getEditedRecipe(day.dayNumber, ri, day.recipes[ri]),
              dayNumber: day.dayNumber,
            })
          }
        }
      }
      const plan = await createMealPlan({
        name: planName.trim() || t("defaultPlanName", { date: new Date().toLocaleDateString("sv-SE") }),
        numberOfDays: stream.result.parsedRequest.numberOfDays,
        numberOfPeople: stream.result.parsedRequest.numberOfPeople,
        ...(stream.result.description && { description: stream.result.description }),
        originalInput: query,
        recipes: recipes.map(({ recipe, dayNumber }) => ({
          title: recipe.dishName,
          source: "GENERATED" as const,
          text: serializeRecipeText(recipe),
          dayNumber,
          ingredients: recipe.ingredients.map((ing) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit?.canonical ?? "",
            ...(ing.categoryId && { categoryId: ing.categoryId }),
            ...(ing.note && { note: ing.note }),
          })),
        })),
      })

      setSavedPlanId(plan.id)
      setSaveDialogOpen(false)
    } catch {
      // save error handled silently
    } finally {
      setSavingPlan(false)
    }
  }

  // Use partial data during streaming, full result after done
  const partialDays = stream.partial?.days ?? []
  const displayDays = stream.result?.days ?? partialDays
  const displayParsedRequest = stream.result?.parsedRequest ?? stream.partial?.parsedRequest
  const isDone = !!stream.result

  // Auto-scroll only when a new day/recipe card appears
  const resultsEndRef = useRef<HTMLDivElement>(null)
  const totalRecipeCount = displayDays.reduce((sum, d) => sum + (d.recipes?.length ?? 0), 0)
  useEffect(() => {
    if (stream.isStreaming && displayDays.length > 0) {
      resultsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [stream.isStreaming, displayDays.length, totalRecipeCount])
  // Final scroll when stream completes to show footer actions
  useEffect(() => {
    if (stream.result) {
      const t = setTimeout(() => resultsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 150)
      return () => clearTimeout(t)
    }
  }, [stream.result])

  const unitOptions = UNITS.map((u) => ({ value: u, label: tList(`units.${u}`) }))
  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: localizeCategoryName(c),
    icon: c.icon,
  }))

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
                {stream.result && totalSelectedCount > 0 && !savedPlanId && (
                  <Button
                    onClick={() => { setPlanName(""); setSaveDialogOpen(true) }}
                    variant="outline"
                  >
                    <ClipboardList className="size-4" />
                    {t("savePlanButton", { count: totalSelectedCount })}
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
          {stream.isStreaming && !partialDays.length && (
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

          {/* Day sections with recipe cards */}
          {displayDays.map((day) => {
            if (!day.dayNumber) return null
            const dayRecipes = day.recipes ?? []
            const daySelectedSet = selectedRecipes.get(day.dayNumber)
            const allDaySelected = isDone && daySelectedSet?.size === dayRecipes.length
            return (
              <div key={day.dayNumber} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  {isDone && !savedPlanId && (
                    <input
                      type="checkbox"
                      checked={allDaySelected ?? false}
                      onChange={() => toggleDay(day.dayNumber, dayRecipes.length)}
                      className="size-4 accent-primary"
                    />
                  )}
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {t("dayTitle", { day: day.dayNumber })}
                  </h3>
                </div>
                {dayRecipes.map((recipe, recipeIndex) => {
                  if (!recipe.dishName) return null
                  const edited = isDone ? getEditedRecipe(day.dayNumber, recipeIndex, recipe) : recipe
                  const isSelected = isRecipeSelected(day.dayNumber, recipeIndex)
                  return (
                    <RecipeCard
                      key={recipeIndex}
                      dishName={edited.dishName}
                      description={edited.description ?? ""}
                      cookingTimeLabel={
                        edited.cookingTime
                          ? t("cookingTime", { time: edited.cookingTime })
                          : undefined
                      }
                      ingredients={edited.ingredients ?? []}
                      instructions={edited.instructions ?? []}
                      instructionsLabel={t("instructionsLabel")}
                      defaultOpen={false}
                      categoryMap={categoryMap}
                      {...(isDone && isSelected && {
                        cookingTime: edited.cookingTime,
                        onEditCookingTime: (time: number) => updateRecipe(day.dayNumber, recipeIndex, recipe, (r) => ({ ...r, cookingTime: time })),
                        onEditDishName: (name: string) => updateRecipe(day.dayNumber, recipeIndex, recipe, (r) => ({ ...r, dishName: name })),
                        onEditDescription: (desc: string) => updateRecipe(day.dayNumber, recipeIndex, recipe, (r) => ({ ...r, description: desc })),
                        onEditIngredient: (idx: number, data: RecipeIngredient) =>
                          updateRecipe(day.dayNumber, recipeIndex, recipe, (r) => ({ ...r, ingredients: r.ingredients.map((ing, i) => i === idx ? data : ing) })),
                        onDeleteIngredient: (idx: number) =>
                          updateRecipe(day.dayNumber, recipeIndex, recipe, (r) => ({ ...r, ingredients: r.ingredients.filter((_, i) => i !== idx) })),
                        onAddIngredient: (data: RecipeIngredient) =>
                          updateRecipe(day.dayNumber, recipeIndex, recipe, (r) => ({ ...r, ingredients: [...r.ingredients, data] })),
                        onEditInstruction: (idx: number, text: string) =>
                          updateRecipe(day.dayNumber, recipeIndex, recipe, (r) => ({ ...r, instructions: r.instructions.map((s, i) => i === idx ? { ...s, text } : s) })),
                        onDeleteInstruction: (idx: number) =>
                          updateRecipe(day.dayNumber, recipeIndex, recipe, (r) => ({ ...r, instructions: r.instructions.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 })) })),
                        onAddInstruction: (text: string) =>
                          updateRecipe(day.dayNumber, recipeIndex, recipe, (r) => ({ ...r, instructions: [...r.instructions, { step: r.instructions.length + 1, text }] })),
                        unitOptions,
                        categoryOptions,
                        ingredientNamePlaceholder: t("ingredientNamePlaceholder"),
                        qtyPlaceholder: t("qtyPlaceholder"),
                        unitPlaceholder: t("unitPlaceholder"),
                        categoryPlaceholder: t("categoryPlaceholder"),
                        addIngredientLabel: t("addIngredient"),
                        addStepLabel: t("addStep"),
                        stepPlaceholder: t("stepPlaceholder"),
                      })}
                      footer={
                        isDone && !savedPlanId ? (
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRecipe(day.dayNumber, recipeIndex)}
                              className="size-4 accent-primary"
                            />
                            {t("includeInPlan")}
                          </label>
                        ) : undefined
                      }
                    />
                  )
                })}
              </div>
            )
          })}

          {/* Streaming dots */}
          {stream.isStreaming && displayDays.length > 0 && (
            <div className="flex items-center justify-center gap-1.5 py-4">
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary" />
            </div>
          )}

          {stream.result && displayDays.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-muted/20 px-4 py-16">
              <Sparkles className="mb-4 size-12 text-muted-foreground/40" />
              <p className="text-center text-sm font-medium text-muted-foreground">
                {t("noRecipes")}
              </p>
            </div>
          )}
          <div ref={resultsEndRef} />
        </div>
      </div>

      {/* Save plan dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("savePlanDialogTitle")}</DialogTitle>
            <DialogDescription>{t("savePlanDialogDescription")}</DialogDescription>
          </DialogHeader>
          <Input
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            placeholder={t("planNamePlaceholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleSavePlan() }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSavePlan} disabled={savingPlan}>
              {savingPlan && <LoaderCircle className="animate-spin" />}
              {savingPlan ? t("savingPlan") : t("savePlanConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </main>
  )
}
