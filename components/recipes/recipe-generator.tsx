"use client"

import { useState, useEffect, useRef } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  ChevronDown,
  LoaderCircle,
  Check,
  Sparkles,
  Bookmark,
  ShoppingCart,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { UNITS, type SingleRecipeResponse, type GeneratedRecipe, type RecipeIngredient } from "@/lib/types"
import { generateSingleRecipe, streamSingleRecipe, saveRecipe, createShoppingList } from "@/lib/api"
import { useCategories } from "@/hooks/use-categories"
import { useCategoryLocalization } from "@/hooks/use-category-localization"
import { useStream } from "@/hooks/use-stream"
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
import { RecipeCard } from "@/components/recipes/recipe-card"

const MAX_LENGTH = 5000

export function RecipeGenerator() {
  const t = useTranslations("RecipeGenerator")
  const tSave = useTranslations("SavedRecipes")
  const tList = useTranslations("ShoppingList")
  const locale = useLocale()
  const { categories, categoryMap } = useCategories()
  const { localizeCategoryName } = useCategoryLocalization()

  const [query, setQuery] = useState("")
  const [queryOpen, setQueryOpen] = useState(true)
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState<number | null>(null)
  const [editedRecipes, setEditedRecipes] = useState<Map<number, GeneratedRecipe>>(new Map())
  const [editedPeople, setEditedPeople] = useState<number | null>(null)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [savingRecipe, setSavingRecipe] = useState(false)
  const [savedRecipeIndexes, setSavedRecipeIndexes] = useState<Set<number>>(new Set())
  const [createListDialogOpen, setCreateListDialogOpen] = useState(false)
  const [listName, setListName] = useState("")
  const [savingList, setSavingList] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const stream = useStream<SingleRecipeResponse>()
  const { abort } = stream

  useEffect(() => {
    return () => abort()
  }, [abort])

  // Reset selection state when stream finishes
  useEffect(() => {
    if (stream.result) {
      setSelectedRecipeIndex(null)
      setEditedRecipes(new Map())
      setEditedPeople(stream.result.numberOfPeople)
      setSavedRecipeIndexes(new Set())
      setSavedSuccess(false)
    }
  }, [stream.result])

  const charCount = query.length
  const isOverLimit = charCount > MAX_LENGTH
  const isSubmitDisabled = charCount < 3 || isOverLimit || stream.isLoading

  function getEditedRecipe(index: number): GeneratedRecipe {
    return editedRecipes.get(index) ?? displayRecipes[index]
  }

  function updateRecipe(index: number, updater: (r: GeneratedRecipe) => GeneratedRecipe) {
    const base = editedRecipes.get(index) ?? structuredClone(displayRecipes[index])
    if (!base) return
    setEditedRecipes((prev) => new Map(prev).set(index, updater(base)))
  }

  function selectRecipe(index: number) {
    setSelectedRecipeIndex(index === selectedRecipeIndex ? null : index)
    setSavedSuccess(false)
    setListName("")
  }

  async function handleSaveRecipe(opts: { title: string }) {
    if (selectedRecipeIndex === null) return
    const recipe = getEditedRecipe(selectedRecipeIndex)
    if (!recipe) return

    setSavingRecipe(true)
    try {
      await saveRecipe({
        title: opts.title || undefined,
        source: "GENERATED",
        text: serializeRecipeText(recipe),
        originalInput: query,
        ingredients: recipe.ingredients.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit?.canonical ?? "",
          ...(ing.categoryId && { categoryId: ing.categoryId }),
          ...(ing.note && { note: ing.note }),
        })),
      })
      setSavedRecipeIndexes((prev) => new Set(prev).add(selectedRecipeIndex))
      setSaveDialogOpen(false)
    } catch {
      // save error handled silently
    } finally {
      setSavingRecipe(false)
    }
  }

  async function handleCreateList() {
    if (selectedRecipeIndex === null) return
    const recipe = getEditedRecipe(selectedRecipeIndex)
    if (!recipe) return

    setSavingList(true)
    try {
      await createShoppingList({
        name: listName.trim() || tList("defaultListName", { date: new Date().toLocaleDateString("sv-SE") }),
        items: recipe.ingredients.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit?.canonical ?? "",
          ...(ing.categoryId && { categoryId: ing.categoryId }),
          ...(ing.note && { note: ing.note }),
        })),
      })
      setSavedSuccess(true)
      setCreateListDialogOpen(false)
    } catch {
      // error handled silently
    } finally {
      setSavingList(false)
    }
  }

  function handleGenerate() {
    setSavedRecipeIndexes(new Set())
    setSavedSuccess(false)
    setListName("")
    setSelectedRecipeIndex(null)
    setEditedRecipes(new Map())
    setEditedPeople(null)
    stream.start(
      (callbacks, signal) =>
        streamSingleRecipe(query, locale, callbacks, signal),
      () => generateSingleRecipe(query, locale),
    )
  }

  // Use partial data during streaming, full result after done
  const partialRecipes = stream.partial?.recipes ?? []
  const displayRecipes = stream.result?.recipes ?? partialRecipes
  const displayPeople = editedPeople ?? stream.result?.numberOfPeople ?? stream.partial?.numberOfPeople
  const isDone = !!stream.result

  // Auto-scroll only when a new recipe card appears, not on content changes within cards
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
              <CardFooter>
                <Button onClick={handleGenerate} disabled={isSubmitDisabled}>
                  {stream.isLoading && <LoaderCircle className="animate-spin" />}
                  {stream.isLoading ? t("generating") : t("generateButton")}
                </Button>
              </CardFooter>
            </>
          )}
        </Card>

        {/* Right column — results */}
        <div className="relative space-y-6">
          {/* Streaming status */}
          {stream.isStreaming && !partialRecipes.length && (
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
                  peopleLabel={
                    displayPeople && displayPeople > 0
                      ? t("people", { count: displayPeople })
                      : undefined
                  }
                  cookingTimeLabel={
                    edited.cookingTime
                      ? t("cookingTime", { time: edited.cookingTime })
                      : undefined
                  }
                  ingredients={edited.ingredients ?? []}
                  instructions={edited.instructions ?? []}
                  instructionsLabel={t("instructionsLabel")}
                  defaultOpen={isSelected}
                  categoryMap={categoryMap}
                  {...(isDone && isSelected && {
                    cookingTime: edited.cookingTime,
                    people: displayPeople,
                    onEditCookingTime: (time: number) => updateRecipe(index, (r) => ({ ...r, cookingTime: time })),
                    onEditPeople: (p: number) => setEditedPeople(p),
                    onEditDishName: (name: string) => updateRecipe(index, (r) => ({ ...r, dishName: name })),
                    onEditDescription: (desc: string) => updateRecipe(index, (r) => ({ ...r, description: desc })),
                    onEditIngredient: (idx: number, data: RecipeIngredient) =>
                      updateRecipe(index, (r) => ({ ...r, ingredients: r.ingredients.map((ing, i) => i === idx ? data : ing) })),
                    onDeleteIngredient: (idx: number) =>
                      updateRecipe(index, (r) => ({ ...r, ingredients: r.ingredients.filter((_, i) => i !== idx) })),
                    onAddIngredient: (data: RecipeIngredient) =>
                      updateRecipe(index, (r) => ({ ...r, ingredients: [...r.ingredients, data] })),
                    onEditInstruction: (idx: number, text: string) =>
                      updateRecipe(index, (r) => ({ ...r, instructions: r.instructions.map((s, i) => i === idx ? { ...s, text } : s) })),
                    onDeleteInstruction: (idx: number) =>
                      updateRecipe(index, (r) => ({ ...r, instructions: r.instructions.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 })) })),
                    onAddInstruction: (text: string) =>
                      updateRecipe(index, (r) => ({ ...r, instructions: [...r.instructions, { step: r.instructions.length + 1, text }] })),
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
                    isDone ? (
                      <div className="flex w-full flex-col gap-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={isSelected ? "secondary" : "default"}
                            onClick={() => selectRecipe(index)}
                          >
                            {isSelected ? (
                              <Check className="size-4" />
                            ) : (
                              <Sparkles className="size-4" />
                            )}
                            {isSelected ? t("selected") : t("selectRecipe")}
                          </Button>
                          {savedRecipeIndexes.has(index) ? (
                            <Button variant="outline" size="sm" asChild>
                              <Link href="/recipes" prefetch={false}>
                                <Check className="size-4" />
                                {tSave("recipeSaved")}
                              </Link>
                            </Button>
                          ) : isSelected ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSaveDialogOpen(true)}
                            >
                              <Bookmark className="size-4" />
                              {tSave("saveRecipe")}
                            </Button>
                          ) : null}
                        </div>

                        {isSelected && (
                          <div className="border-t pt-3">
                            {savedSuccess ? (
                              <div className="flex items-center gap-2">
                                <Check className="size-4 text-primary" />
                                <Button variant="link" size="sm" asChild>
                                  <Link href="/shopping-list" prefetch={false}>
                                    <ShoppingCart className="size-4" />
                                    {t("viewShoppingLists")}
                                  </Link>
                                </Button>
                              </div>
                            ) : (
                              <Button
                                onClick={() => setCreateListDialogOpen(true)}
                                className="w-full"
                              >
                                <ShoppingCart className="size-4" />
                                {t("createShoppingList")}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : undefined
                  }
                />
              </div>
            )
          })}

          {stream.isStreaming && displayRecipes.length > 0 && (
            <div className="flex items-center justify-center gap-1.5 py-4">
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary" />
            </div>
          )}

          {stream.result && displayRecipes.length === 0 && (
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

      <SaveRecipeDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSaveRecipe}
        saving={savingRecipe}
        defaultTitle={
          selectedRecipeIndex !== null
            ? getEditedRecipe(selectedRecipeIndex)?.dishName ?? ""
            : ""
        }
      />

      <Dialog open={createListDialogOpen} onOpenChange={setCreateListDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createShoppingList")}</DialogTitle>
            <DialogDescription>{t("createListDescription")}</DialogDescription>
          </DialogHeader>
          <Input
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder={t("listNamePlaceholder")}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateListDialogOpen(false)}
              disabled={savingList}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleCreateList}
              disabled={savingList}
            >
              {savingList ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <ShoppingCart className="size-4" />
              )}
              {savingList ? t("saving") : t("createShoppingList")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
