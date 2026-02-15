"use client"

import { useState, useEffect } from "react"
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
import type { SingleRecipeResponse } from "@/lib/types"
import { generateSingleRecipe, streamSingleRecipe, saveRecipe, createShoppingList } from "@/lib/api"
import { useCategories } from "@/hooks/use-categories"
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
  const locale = useLocale()
  const { categoryMap } = useCategories()

  const [query, setQuery] = useState("")
  const [queryOpen, setQueryOpen] = useState(true)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [savingRecipe, setSavingRecipe] = useState(false)
  const [recipeSaved, setRecipeSaved] = useState(false)
  const [createListDialogOpen, setCreateListDialogOpen] = useState(false)
  const [listName, setListName] = useState("")
  const [savingList, setSavingList] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const stream = useStream<SingleRecipeResponse>()
  const { abort } = stream

  useEffect(() => {
    return () => abort()
  }, [abort])

  const charCount = query.length
  const isOverLimit = charCount > MAX_LENGTH
  const isSubmitDisabled = charCount < 3 || isOverLimit || stream.isLoading

  async function handleSaveRecipe(opts: { title: string }) {
    if (!stream.result) return
    const recipe = stream.result.recipe

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
        })),
      })
      setRecipeSaved(true)
      setSaveDialogOpen(false)
    } catch {
      // save error handled silently
    } finally {
      setSavingRecipe(false)
    }
  }

  async function handleCreateList() {
    if (!stream.result) return
    const recipe = stream.result.recipe

    setSavingList(true)
    try {
      await createShoppingList({
        ...(listName.trim() ? { name: listName.trim() } : {}),
        items: recipe.ingredients.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit?.canonical ?? "",
          ...(ing.categoryId && { categoryId: ing.categoryId }),
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
    setRecipeSaved(false)
    setSavedSuccess(false)
    setListName("")
    stream.start(
      (callbacks, signal) =>
        streamSingleRecipe(query, locale, callbacks, signal),
      () => generateSingleRecipe(query, locale),
    )
  }

  // Use partial data during streaming, full result after done
  const partialRecipe = stream.partial?.recipe
  const displayRecipe = stream.result?.recipe ?? partialRecipe
  const displayPeople = stream.result?.numberOfPeople ?? stream.partial?.numberOfPeople

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

        {/* Right column — result */}
        <div className="space-y-6">
          {/* Streaming status */}
          {stream.isStreaming && !partialRecipe && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-4 animate-pulse text-primary" />
              <span className="animate-pulse">{t("streamingMessage")}</span>
            </div>
          )}

          {/* Recipe card — renders during streaming (partial) and after done (full) */}
          {displayRecipe?.dishName && (
            <RecipeCard
              dishName={displayRecipe.dishName}
              description={displayRecipe.description ?? ""}
              peopleLabel={
                displayPeople && displayPeople > 0
                  ? t("people", { count: displayPeople })
                  : undefined
              }
              cookingTimeLabel={
                displayRecipe.cookingTime
                  ? t("cookingTime", { time: displayRecipe.cookingTime })
                  : undefined
              }
              ingredients={displayRecipe.ingredients ?? []}
              instructions={displayRecipe.instructions ?? []}
              instructionsLabel={t("instructionsLabel")}
              defaultOpen={true}
              categoryMap={categoryMap}
              footer={
                stream.result ? (
                  <div className="flex flex-col gap-3 w-full">
                    {recipeSaved ? (
                      <div className="flex items-center gap-2">
                        <Check className="size-4 text-primary" />
                        <Button variant="link" size="sm" asChild>
                          <Link href="/recipes">
                            <Bookmark className="size-4" />
                            {tSave("viewSavedRecipes")}
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setSaveDialogOpen(true)}
                        className="w-full"
                      >
                        <Bookmark className="size-4" />
                        {tSave("saveRecipe")}
                      </Button>
                    )}

                    <div className="border-t pt-3">
                      {savedSuccess ? (
                        <div className="flex items-center gap-2">
                          <Check className="size-4 text-primary" />
                          <Button variant="link" size="sm" asChild>
                            <Link href="/shopping-list">
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
                  </div>
                ) : undefined
              }
            />
          )}

          {stream.result && stream.result.recipe.ingredients.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-muted/20 px-4 py-16">
              <Sparkles className="mb-4 size-12 text-muted-foreground/40" />
              <p className="text-center text-sm font-medium text-muted-foreground">
                {t("noRecipes")}
              </p>
            </div>
          )}
        </div>
      </div>

      <SaveRecipeDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSaveRecipe}
        saving={savingRecipe}
        defaultTitle={stream.result?.recipe.dishName ?? ""}
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
