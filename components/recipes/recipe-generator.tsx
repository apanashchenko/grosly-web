"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  ChevronDown,
  LoaderCircle,
  Check,
  Sparkles,
  Bookmark,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { SingleRecipeResponse } from "@/lib/types"
import { generateSingleRecipe, saveRecipe } from "@/lib/api"
import { useCategories } from "@/hooks/use-categories"
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

const MAX_LENGTH = 500

export function RecipeGenerator() {
  const t = useTranslations("RecipeGenerator")
  const tSave = useTranslations("SavedRecipes")
  const locale = useLocale()
  const { categoryMap } = useCategories()

  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SingleRecipeResponse | null>(null)
  const [queryOpen, setQueryOpen] = useState(true)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [savingRecipe, setSavingRecipe] = useState(false)
  const [recipeSaved, setRecipeSaved] = useState(false)

  const charCount = query.length
  const isOverLimit = charCount > MAX_LENGTH
  const isSubmitDisabled = charCount < 3 || isOverLimit || isLoading

  async function handleSaveRecipe(opts: { title: string }) {
    if (!result) return
    const recipe = result.recipe

    setSavingRecipe(true)
    try {
      await saveRecipe({
        title: opts.title || undefined,
        source: "GENERATED",
        text: serializeRecipeText(recipe),
        ingredients: recipe.ingredients.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit?.canonical ?? "",
          ...(ing.categoryId && { categoryId: ing.categoryId }),
        })),
      })
      setRecipeSaved(true)
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
    setRecipeSaved(false)

    try {
      const data = await generateSingleRecipe(query, locale)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError"))
    } finally {
      setIsLoading(false)
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

        {/* Right column — result */}
        <div className="space-y-6">
          {result && (
            <>
              {/* People count badge */}
              {result.numberOfPeople > 0 && (
                <div className="flex items-center gap-2">
                  <Badge className="gap-1">
                    <Users className="size-3" />
                    {t("people", { count: result.numberOfPeople })}
                  </Badge>
                </div>
              )}

              {/* Recipe card */}
              <RecipeCard
                dishName={result.recipe.dishName}
                description={result.recipe.description}
                cookingTimeLabel={t("cookingTime", { time: result.recipe.cookingTime })}
                ingredients={result.recipe.ingredients}
                instructions={result.recipe.instructions}
                instructionsLabel={t("instructionsLabel")}
                defaultOpen={true}
                categoryMap={categoryMap}
                footer={
                  <div className="flex flex-wrap gap-2">
                    {recipeSaved ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/recipes">
                          <Check className="size-4" />
                          {tSave("recipeSaved")}
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setSaveDialogOpen(true)}
                      >
                        <Bookmark className="size-4" />
                        {tSave("saveRecipe")}
                      </Button>
                    )}
                  </div>
                }
              />
            </>
          )}

          {result && result.recipe.ingredients.length === 0 && (
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
        defaultTitle={result?.recipe.dishName ?? ""}
      />
    </main>
  )
}
