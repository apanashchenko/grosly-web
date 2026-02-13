"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import {
  ChevronDown,
  Loader2,
  NotebookPen,
  Plus,
  Trash2,
  UtensilsCrossed,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { RecipePickerDialog } from "@/components/meal-plans/recipe-picker-dialog"
import { ManualRecipeCreator } from "@/components/recipes/manual-recipe-creator"
import { useRouter } from "@/i18n/navigation"
import {
  createMealPlan,
  updateMealPlan,
  getSavedRecipe,
} from "@/lib/api"
import type { SavedRecipeResponse, CreateMealPlanRecipeInput, ParsedIngredient } from "@/lib/types"
import { useCategoryLocalization } from "@/hooks/use-category-localization"
import { useCategories } from "@/hooks/use-categories"

const SOURCE_STYLES: Record<string, string> = {
  PARSED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  GENERATED: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
  SUGGESTED: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  MANUAL: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
  MEAL_PLAN: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800",
}

interface NewRecipe {
  id: string
  title: string
  text: string
  ingredients: ParsedIngredient[]
}

export function ManualMealPlanCreator() {
  const t = useTranslations("MealPlans")
  const tSaved = useTranslations("SavedRecipes")
  const router = useRouter()
  const { localizeCategoryName } = useCategoryLocalization()
  const { categoryMap } = useCategories()

  // Metadata
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [numberOfDays, setNumberOfDays] = useState("1")
  const [numberOfPeople, setNumberOfPeople] = useState("1")

  // Saved recipes
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [recipeDetails, setRecipeDetails] = useState<Map<string, SavedRecipeResponse>>(new Map())
  const [loadingRecipes, setLoadingRecipes] = useState<Set<string>>(new Set())
  const [expandedRecipes, setExpandedRecipes] = useState<Set<string>>(new Set())

  // New recipes (created inline)
  const [newRecipes, setNewRecipes] = useState<NewRecipe[]>([])

  // UI state
  const [pickerOpen, setPickerOpen] = useState(false)
  const [creatingNewRecipe, setCreatingNewRecipe] = useState(false)
  const [saving, setSaving] = useState(false)

  const totalCount = selectedIds.length + newRecipes.length

  // --- Saved recipe handlers ---

  async function handleAddRecipes(recipeIds: string[]) {
    const newIds = recipeIds.filter((id) => !selectedIds.includes(id))
    if (newIds.length === 0) return
    setSelectedIds((prev) => [...prev, ...newIds])
    setPickerOpen(false)

    const fetching = newIds.map(async (id) => {
      setLoadingRecipes((prev) => new Set(prev).add(id))
      try {
        const recipe = await getSavedRecipe(id)
        setRecipeDetails((prev) => new Map(prev).set(id, recipe))
      } catch {
        // keep id in list, just without details
      } finally {
        setLoadingRecipes((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    })
    await Promise.all(fetching)
  }

  function handleRemoveSavedRecipe(id: string) {
    setSelectedIds((prev) => prev.filter((rid) => rid !== id))
    setRecipeDetails((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
    setExpandedRecipes((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function toggleExpanded(id: string) {
    setExpandedRecipes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // --- New recipe handlers ---

  function handleNewRecipeAdd(recipe: { title: string; text: string; ingredients: ParsedIngredient[] }) {
    setNewRecipes((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, ...recipe },
    ])
    setCreatingNewRecipe(false)
  }

  function handleRemoveNewRecipe(id: string) {
    setNewRecipes((prev) => prev.filter((r) => r.id !== id))
    setExpandedRecipes((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  // --- Save ---

  async function handleSave() {
    setSaving(true)
    try {
      const inlineRecipes: CreateMealPlanRecipeInput[] = newRecipes.map((r) => ({
        title: r.title,
        source: "MEAL_PLAN" as const,
        text: r.text,
        ...(r.ingredients.length > 0
          ? {
              ingredients: r.ingredients.map((ing) => ({
                name: ing.name,
                quantity: ing.quantity ?? 0,
                unit: ing.unit,
                ...(ing.categoryId ? { categoryId: ing.categoryId } : {}),
              })),
            }
          : {}),
      }))

      const plan = await createMealPlan({
        ...(name.trim() && { name: name.trim() }),
        ...(description.trim() && { description: description.trim() }),
        numberOfDays: parseInt(numberOfDays) || 1,
        numberOfPeople: parseInt(numberOfPeople) || 1,
        ...(inlineRecipes.length > 0 && { recipes: inlineRecipes }),
      })

      if (selectedIds.length > 0) {
        const createdIds = plan.recipes.map((r) => r.recipeId)
        await updateMealPlan(plan.id, {
          recipes: [...createdIds, ...selectedIds],
        })
      }

      router.push(`/meal-plans/${plan.id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("unexpectedError")
      toast.error(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setSaving(false)
    }
  }

  // --- Render new recipe creator ---

  if (creatingNewRecipe) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <PageHeader
          title={t("newRecipeTitle")}
          subtitle={t("newRecipeDescription")}
        />
        <ManualRecipeCreator
          mode="meal-plan"
          onAdd={handleNewRecipeAdd}
          onCancel={() => setCreatingNewRecipe(false)}
        />
      </main>
    )
  }

  // --- Render plan form ---

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader
        title={t("manualCreateHeading")}
        subtitle={t("manualCreateSubtitle")}
      />

      {/* Metadata */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t("planInfoTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              maxLength={500}
              className="min-h-[80px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("daysLabel")}</Label>
              <Input
                type="number"
                min={1}
                max={7}
                value={numberOfDays}
                onChange={(e) => setNumberOfDays(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("peopleLabel")}</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={numberOfPeople}
                onChange={(e) => setNumberOfPeople(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add recipe buttons */}
      <div className="mb-3 flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setPickerOpen(true)}
        >
          <Plus className="size-4" />
          {t("addRecipes")}
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setCreatingNewRecipe(true)}
        >
          <NotebookPen className="size-4" />
          {t("newRecipeButton")}
        </Button>
      </div>

      {/* Selected Recipes */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t("selectedRecipesTitle")}</CardTitle>
          {totalCount > 0 && (
            <CardDescription>
              {t("selectedRecipesCount", { count: totalCount })}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {totalCount === 0 && (
            <EmptyState
              icon={UtensilsCrossed}
              message={t("noRecipesSelected")}
            />
          )}

          {/* Saved recipes */}
          {selectedIds.map((id) => {
            const recipe = recipeDetails.get(id)
            const isLoading = loadingRecipes.has(id)
            const isExpanded = expandedRecipes.has(id)

            return (
              <Card key={id}>
                <CardHeader className="py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {recipe && recipe.ingredients.length > 0 && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="shrink-0 text-muted-foreground"
                        onClick={() => toggleExpanded(id)}
                      >
                        <ChevronDown
                          className={cn(
                            "size-4 transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </Button>
                    )}
                    <div className="min-w-0 flex-1">
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {t("loading")}
                          </span>
                        </div>
                      ) : (
                        <CardTitle className="text-sm">
                          {recipe?.title ?? id}
                        </CardTitle>
                      )}
                    </div>
                    {recipe && (
                      <Badge
                        variant="outline"
                        className={`shrink-0 text-xs ${SOURCE_STYLES[recipe.source] ?? ""}`}
                      >
                        {tSaved(`source.${recipe.source}`)}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveSavedRecipe(id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                {isExpanded && recipe && recipe.ingredients.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="divide-y">
                      {recipe.ingredients.map((ing) => (
                        <div
                          key={ing.id}
                          className="flex items-center gap-2 py-1.5 text-sm text-muted-foreground"
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {ing.name}
                          </span>
                          <span className="shrink-0 tabular-nums text-xs">
                            {ing.quantity} {ing.unit}
                          </span>
                          {ing.category && (
                            <span className="shrink-0 text-xs">
                              {ing.category.icon ?? ""}{" "}
                              {localizeCategoryName(
                                categoryMap.get(ing.category.id) ?? ing.category
                              )}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}

          {/* New inline recipes */}
          {newRecipes.map((recipe) => {
            const isExpanded = expandedRecipes.has(recipe.id)

            return (
              <Card key={recipe.id}>
                <CardHeader className="py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {(recipe.ingredients.length > 0 || recipe.text) && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="shrink-0 text-muted-foreground"
                        onClick={() => toggleExpanded(recipe.id)}
                      >
                        <ChevronDown
                          className={cn(
                            "size-4 transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </Button>
                    )}
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm">
                        {recipe.title}
                      </CardTitle>
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-xs ${SOURCE_STYLES.MEAL_PLAN}`}
                    >
                      {t("newRecipeSource")}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveNewRecipe(recipe.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0 space-y-2">
                    {recipe.ingredients.length > 0 && (
                      <div className="divide-y">
                        {recipe.ingredients.map((ing, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 py-1.5 text-sm text-muted-foreground"
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {ing.name}
                            </span>
                            <span className="shrink-0 tabular-nums text-xs">
                              {ing.quantity ?? 0} {ing.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {recipe.ingredients.length === 0 && recipe.text && (
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                        {recipe.text}
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}

        </CardContent>
      </Card>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full"
        size="lg"
      >
        {saving ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {t("savingPlan")}
          </>
        ) : (
          t("savePlan")
        )}
      </Button>

      {/* Saved recipe picker */}
      <RecipePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onAdd={handleAddRecipes}
        adding={false}
        excludeRecipeIds={selectedIds}
      />
    </main>
  )
}
