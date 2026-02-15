"use client"

import { useState, useEffect, useRef } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  ChevronDown,
  Lightbulb,
  LoaderCircle,
  Plus,
  ShoppingCart,
  X,
  Check,
  Bookmark,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { UNITS, type SuggestRecipesResponse, type SuggestedRecipe, type RecipeIngredient } from "@/lib/types"
import { suggestRecipes, streamSuggestRecipes, createShoppingList, saveRecipe } from "@/lib/api"
import { useCategories } from "@/hooks/use-categories"
import { useCategoryLocalization } from "@/hooks/use-category-localization"
import { useStream } from "@/hooks/use-stream"
import { serializeRecipeText } from "@/components/recipes/serialize-recipe"
import { SaveRecipeDialog } from "@/components/recipes/save-recipe-dialog"
import { PageHeader } from "@/components/shared/page-header"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RecipeCard } from "@/components/recipes/recipe-card"
import { ShoppingListCard } from "@/components/shopping-list/shopping-list-card"

const MAX_INGREDIENTS = 20

export function RecipeSuggester() {
  const t = useTranslations("RecipeSuggester")
  const tSave = useTranslations("SavedRecipes")
  const locale = useLocale()
  const tList = useTranslations("ShoppingList")
  const { categories, categoryMap } = useCategories()
  const { localizeCategoryName } = useCategoryLocalization()

  const [ingredients, setIngredients] = useState<string[]>([])
  const [currentIngredient, setCurrentIngredient] = useState("")
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState<number | null>(
    null
  )
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())
  const [ingredientsOpen, setIngredientsOpen] = useState(true)
  const [strictMode, setStrictMode] = useState(false)
  const [savingList, setSavingList] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [savingRecipe, setSavingRecipe] = useState(false)
  const [recipeToSave, setRecipeToSave] = useState<number | null>(null)
  const [savedRecipeIndexes, setSavedRecipeIndexes] = useState<Set<number>>(new Set())
  const [editedRecipes, setEditedRecipes] = useState<Map<number, SuggestedRecipe>>(new Map())

  const stream = useStream<SuggestRecipesResponse>()
  const { abort } = stream

  useEffect(() => {
    return () => abort()
  }, [abort])

  useEffect(() => {
    if (stream.result) {
      setSelectedRecipeIndex(null)
      setCheckedItems(new Set())
      setSavedSuccess(false)
      setSavedRecipeIndexes(new Set())
      setEditedRecipes(new Map())
    }
  }, [stream.result])

  function addIngredient() {
    const trimmed = currentIngredient.trim()
    if (!trimmed || ingredients.length >= MAX_INGREDIENTS) return
    if (ingredients.some((i) => i.toLowerCase() === trimmed.toLowerCase()))
      return
    setIngredients((prev) => [...prev, trimmed])
    setCurrentIngredient("")
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSaveRecipe(opts: { title: string }) {
    if (recipeToSave === null || !stream.result) return
    const recipe = editedRecipes.get(recipeToSave) ?? stream.result.suggestedRecipes[recipeToSave]
    if (!recipe) return

    setSavingRecipe(true)
    try {
      await saveRecipe({
        title: opts.title || undefined,
        source: "SUGGESTED",
        text: serializeRecipeText(recipe),
        originalInput: ingredients.join(", "),
        ingredients: recipe.ingredients.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit?.canonical ?? "",
          ...(ing.categoryId && { categoryId: ing.categoryId }),
          ...(ing.note && { note: ing.note }),
        })),
      })
      setSavedRecipeIndexes((prev) => new Set(prev).add(recipeToSave))
      setSaveDialogOpen(false)
    } catch {
      // save error handled silently
    } finally {
      setSavingRecipe(false)
    }
  }

  function handleSearch() {
    if (ingredients.length === 0) return
    stream.start(
      (callbacks, signal) =>
        streamSuggestRecipes(ingredients, locale, callbacks, signal, strictMode || undefined),
      () => suggestRecipes(ingredients, locale, strictMode || undefined),
    )
  }

  function selectRecipe(index: number) {
    setSelectedRecipeIndex(index === selectedRecipeIndex ? null : index)
    setCheckedItems(new Set())
    setSavedSuccess(false)
  }

  // Use partial data during streaming, full result after done
  const partialSuggested = stream.partial?.suggestedRecipes ?? []
  const displayRecipes = stream.result?.suggestedRecipes ?? partialSuggested
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
  const categoryOpts = categories.map((c) => ({
    value: c.id,
    label: localizeCategoryName(c),
    icon: c.icon,
  }))

  function getEditedRecipe(index: number): SuggestedRecipe {
    return editedRecipes.get(index) ?? displayRecipes[index]
  }

  function updateRecipe(index: number, updater: (r: SuggestedRecipe) => SuggestedRecipe) {
    const base = editedRecipes.get(index) ?? structuredClone(displayRecipes[index])
    if (!base) return
    setEditedRecipes((prev) => new Map(prev).set(index, updater(base)))
  }

  const selectedRecipe =
    selectedRecipeIndex !== null
      ? getEditedRecipe(selectedRecipeIndex) ?? null
      : null

  const additionalItems = selectedRecipe?.additionalIngredients ?? []

  async function handleSaveList() {
    if (!selectedRecipe || additionalItems.length === 0) return
    setSavingList(true)
    try {
      await createShoppingList({
        name: selectedRecipe.dishName,
        items: additionalItems.map((name) => ({
          name,
          quantity: 0,
          unit: "",
        })),
      })
      setSavedSuccess(true)
    } catch {
      // save error handled silently
    } finally {
      setSavingList(false)
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <PageHeader title={t("heading")} subtitle={t("subtitle")} />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Left column — ingredient input */}
        <Card>
          <CardHeader>
            <CardTitle>{t("ingredientsTitle")}</CardTitle>
            <CardDescription>{t("ingredientsDescription")}</CardDescription>
            <CardAction>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIngredientsOpen((v) => !v)}
              >
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    ingredientsOpen && "rotate-180"
                  )}
                />
              </Button>
            </CardAction>
          </CardHeader>
          {ingredientsOpen && (
            <>
              <CardContent className="space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    addIngredient()
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={currentIngredient}
                    onChange={(e) => setCurrentIngredient(e.target.value)}
                    placeholder={t("ingredientPlaceholder")}
                    className="flex-1"
                    disabled={ingredients.length >= MAX_INGREDIENTS}
                  />
                  <Button
                    type="submit"
                    disabled={
                      !currentIngredient.trim() ||
                      ingredients.length >= MAX_INGREDIENTS
                    }
                  >
                    <Plus className="size-4" />
                    {t("addButton")}
                  </Button>
                </form>

                {ingredients.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {ingredients.map((ing, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="gap-1 pr-1"
                      >
                        {ing}
                        <button
                          type="button"
                          onClick={() => removeIngredient(index)}
                          className="rounded-full p-0.5 hover:bg-foreground/10"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  {t("ingredientCount", { count: ingredients.length })}
                </p>

                {stream.error && (
                  <p className="text-sm text-destructive">{stream.error}</p>
                )}
              </CardContent>
              <CardFooter className="flex-col items-start gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="strict-mode"
                    checked={strictMode}
                    onCheckedChange={setStrictMode}
                  />
                  <Label htmlFor="strict-mode" className="text-sm cursor-pointer">
                    {t("strictModeLabel")}
                  </Label>
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={ingredients.length === 0 || stream.isLoading}
                >
                  {stream.isLoading && <LoaderCircle className="animate-spin" />}
                  {stream.isLoading ? t("searching") : t("findButton")}
                </Button>
              </CardFooter>
            </>
          )}
        </Card>

        {/* Right column — suggested recipes */}
        <div className="relative space-y-6">
          {/* Streaming status */}
          {stream.isStreaming && !partialSuggested.length && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-4 animate-pulse text-primary" />
              <span className="animate-pulse">{t("streamingMessage")}</span>
            </div>
          )}

          {isDone && displayRecipes.length > 0 && (
            <span className="absolute -top-5 right-0 text-xs text-muted-foreground">
              {t("recipesFound", { count: displayRecipes.length })}
            </span>
          )}

          {displayRecipes.map((recipe, index) => {
            if (!recipe.dishName) return null
            const edited = getEditedRecipe(index)
            const isSelected = selectedRecipeIndex === index
            return (
              <div key={index} className="space-y-3">
                <RecipeCard
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
                  highlightIngredients={edited.matchedIngredients}
                  defaultOpen={false}
                  categoryMap={categoryMap}
                  {...(isDone && {
                    cookingTime: edited.cookingTime,
                    onEditCookingTime: (time: number) => updateRecipe(index, (r) => ({ ...r, cookingTime: time })),
                    onEditDishName: (name: string) => updateRecipe(index, (r) => ({ ...r, dishName: name })),
                    onEditDescription: (desc: string) => updateRecipe(index, (r) => ({ ...r, description: desc })),
                    onEditIngredient: (idx: number, data: RecipeIngredient) =>
                      updateRecipe(index, (r) => ({ ...r, ingredients: r.ingredients.map((ing, i) => i === idx ? data : ing) })),
                    onDeleteIngredient: (idx: number) =>
                      updateRecipe(index, (r) => ({ ...r, ingredients: r.ingredients.filter((_, i) => i !== idx) })),
                    onAddIngredient: (data: RecipeIngredient) =>
                      updateRecipe(index, (r) => ({ ...r, ingredients: [...r.ingredients, data] })),
                    onEditInstruction: (idx: number, text: string) =>
                      updateRecipe(index, (r) => ({ ...r, instructions: (r.instructions ?? []).map((s, i) => i === idx ? { ...s, text } : s) })),
                    onDeleteInstruction: (idx: number) =>
                      updateRecipe(index, (r) => ({ ...r, instructions: (r.instructions ?? []).filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 })) })),
                    onAddInstruction: (text: string) =>
                      updateRecipe(index, (r) => ({ ...r, instructions: [...(r.instructions ?? []), { step: (r.instructions ?? []).length + 1, text }] })),
                    unitOptions,
                    categoryOptions: categoryOpts,
                    ingredientNamePlaceholder: t("ingredientNamePlaceholder"),
                    qtyPlaceholder: t("qtyPlaceholder"),
                    unitPlaceholder: t("unitPlaceholder"),
                    categoryPlaceholder: t("categoryPlaceholder"),
                    addIngredientLabel: t("addIngredient"),
                    addStepLabel: t("addStep"),
                    stepPlaceholder: t("stepPlaceholder"),
                    noCategoryLabel: tList("noCategory"),
                  })}
                  footer={
                    isDone ? (
                      <div className="flex w-full flex-col gap-3">
                        {edited.matchedIngredients && edited.matchedIngredients.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            <span className="text-sm font-medium text-primary">
                              {t("youHave")}:
                            </span>
                            {edited.matchedIngredients.map((name) => (
                              <Badge key={name} variant="default">
                                {name}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {edited.additionalIngredients && edited.additionalIngredients.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            <span className="text-sm font-medium text-muted-foreground">
                              {t("youNeed")}:
                            </span>
                            {edited.additionalIngredients.map((name) => (
                              <Badge key={name} variant="outline">
                                {name}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant={isSelected ? "secondary" : "default"}
                            onClick={() => selectRecipe(index)}
                          >
                            {isSelected ? (
                              <Check className="size-4" />
                            ) : (
                              <ShoppingCart className="size-4" />
                            )}
                            {isSelected ? t("selected") : t("selectRecipe")}
                          </Button>
                          {savedRecipeIndexes.has(index) ? (
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
                      </div>
                    ) : undefined
                  }
                />
              </div>
            )
          })}

          {stream.result && stream.result.suggestedRecipes.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-muted/20 px-4 py-16">
              <Lightbulb className="mb-4 size-12 text-muted-foreground/40" />
              <p className="text-center text-sm font-medium text-muted-foreground">
                {strictMode ? t("noRecipesStrict") : t("noRecipes")}
              </p>
            </div>
          )}
          <div ref={resultsEndRef} />

          {/* Shopping list from additional ingredients */}
          {selectedRecipe && additionalItems.length > 0 && (
            <div className="space-y-4">
              <ShoppingListCard
                title={t("shoppingListTitle")}
                description={t("purchased", {
                  checked: checkedItems.size,
                  total: additionalItems.length,
                })}
                items={additionalItems.map((name, index) => ({
                  name,
                  badge: null,
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

      <SaveRecipeDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSaveRecipe}
        saving={savingRecipe}
        defaultTitle={
          recipeToSave !== null
            ? getEditedRecipe(recipeToSave)?.dishName ?? ""
            : ""
        }

      />
    </main>
  )
}
