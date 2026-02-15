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
  const [includedRecipes, setIncludedRecipes] = useState<Set<number>>(new Set())
  const [editedRecipes, setEditedRecipes] = useState<Map<number, GeneratedRecipe>>(new Map())

  const stream = useStream<GeneratedMealPlanResponse>()
  const { abort } = stream

  useEffect(() => {
    return () => abort()
  }, [abort])

  useEffect(() => {
    if (stream.result) {
      setIncludedRecipes(new Set(stream.result.recipes.map((_, i) => i)))
      setEditedRecipes(new Map(stream.result.recipes.map((r, i) => [i, structuredClone(r)])))
    }
  }, [stream.result])

  const charCount = query.length
  const isOverLimit = charCount > MAX_LENGTH
  const isSubmitDisabled = charCount < 3 || isOverLimit || stream.isLoading

  function getEditedRecipe(index: number): GeneratedRecipe {
    return editedRecipes.get(index) ?? stream.result!.recipes[index]
  }

  function updateRecipe(index: number, updater: (r: GeneratedRecipe) => GeneratedRecipe) {
    setEditedRecipes((prev) => {
      const next = new Map(prev)
      const current = next.get(index) ?? stream.result!.recipes[index]
      next.set(index, updater(current))
      return next
    })
  }

  function handleGenerate() {
    setSavedPlanId(null)
    setEditedRecipes(new Map())
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
      const selected = stream.result.recipes
        .map((_, i) => getEditedRecipe(i))
        .filter((_, i) => includedRecipes.has(i))
      const plan = await createMealPlan({
        name: planName.trim() || t("defaultPlanName", { date: new Date().toLocaleDateString("sv-SE") }),
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
  const partialRecipes = stream.partial?.recipes ?? []
  const displayRecipes = stream.result?.recipes ?? partialRecipes
  const displayParsedRequest = stream.result?.parsedRequest ?? stream.partial?.parsedRequest
  const isDone = !!stream.result

  // Auto-scroll to bottom when new recipe cards appear during streaming
  const resultsEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (stream.isStreaming && displayRecipes.length > 0) {
      resultsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [stream.isStreaming, displayRecipes.length])
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
                {stream.result && includedRecipes.size > 0 && !savedPlanId && (
                  <Button
                    onClick={() => { setPlanName(""); setSaveDialogOpen(true) }}
                    variant="outline"
                  >
                    <ClipboardList className="size-4" />
                    {t("savePlanButton", { count: includedRecipes.size })}
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
          {displayRecipes.map((recipe, index) => {
            if (!recipe.dishName) return null
            const edited = isDone ? getEditedRecipe(index) : recipe
            return (
              <RecipeCard
                key={index}
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
                defaultOpen={true}
                categoryMap={categoryMap}
                {...(isDone && {
                  cookingTime: edited.cookingTime,
                  onEditCookingTime: (time: number) => updateRecipe(index, (r) => ({ ...r, cookingTime: time })),
                  onEditDishName: (name: string) => updateRecipe(index, (r) => ({ ...r, dishName: name })),
                  onEditDescription: (desc: string) => updateRecipe(index, (r) => ({ ...r, description: desc })),
                  onEditIngredient: (idx: number, data: RecipeIngredient) => updateRecipe(index, (r) => ({ ...r, ingredients: r.ingredients.map((ing, i) => i === idx ? data : ing) })),
                  onDeleteIngredient: (idx: number) => updateRecipe(index, (r) => ({ ...r, ingredients: r.ingredients.filter((_, i) => i !== idx) })),
                  onAddIngredient: (data: RecipeIngredient) => updateRecipe(index, (r) => ({ ...r, ingredients: [...r.ingredients, data] })),
                  onEditInstruction: (idx: number, text: string) => updateRecipe(index, (r) => ({ ...r, instructions: r.instructions.map((s, i) => i === idx ? { ...s, text } : s) })),
                  onDeleteInstruction: (idx: number) => updateRecipe(index, (r) => ({ ...r, instructions: r.instructions.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 })) })),
                  onAddInstruction: (text: string) => updateRecipe(index, (r) => ({ ...r, instructions: [...r.instructions, { step: r.instructions.length + 1, text }] })),
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
          })}

          {stream.result && stream.result.recipes.length === 0 && (
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
