"use client"

import { useCallback, useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  Loader2,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  ShoppingCart,
  Trash2,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react"

import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { RecipePickerDialog } from "@/components/meal-plans/recipe-picker-dialog"
import { ManualRecipeCreator } from "@/components/recipes/manual-recipe-creator"
import { Link, useRouter } from "@/i18n/navigation"
import { getMealPlan, updateMealPlan, deleteMealPlan, createShoppingList, saveRecipe } from "@/lib/api"
import type { MealPlanResponse, ParsedIngredient } from "@/lib/types"
import { NONE_CATEGORY, SOURCE_STYLES } from "@/lib/constants"

function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

interface Props {
  planId: string
}

export function MealPlanDetail({ planId }: Props) {
  const t = useTranslations("MealPlans")
  const locale = useLocale()
  const router = useRouter()

  const [plan, setPlan] = useState<MealPlanResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Edit name state
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState("")

  // Edit description state
  const [editingDescription, setEditingDescription] = useState(false)
  const [editDescription, setEditDescription] = useState("")

  // Edit meta state
  const [editingMeta, setEditingMeta] = useState(false)
  const [editDays, setEditDays] = useState("")
  const [editPeople, setEditPeople] = useState("")

  // Add recipe dialog
  const [pickerOpen, setPickerOpen] = useState(false)
  const [addingRecipes, setAddingRecipes] = useState(false)
  const [creatingNewRecipe, setCreatingNewRecipe] = useState(false)

  // Expanded recipes
  const [expandedRecipes, setExpandedRecipes] = useState<Set<string>>(new Set())

  // Shopping list generation
  const [creatingSL, setCreatingSL] = useState(false)
  const [createListDialogOpen, setCreateListDialogOpen] = useState(false)
  const [listName, setListName] = useState("")

  const fetchPlan = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await getMealPlan(planId)
      setPlan(data)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t("unexpectedError"))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId])

  useEffect(() => {
    fetchPlan()
  }, [fetchPlan])

  async function handleUpdateName() {
    if (!plan) return
    const trimmed = editName.trim()
    if (!trimmed) return
    const prevName = plan.name
    setPlan((prev) => (prev ? { ...prev, name: trimmed } : prev))
    setEditingName(false)
    try {
      await updateMealPlan(plan.id, { name: trimmed })
    } catch {
      setPlan((prev) => (prev ? { ...prev, name: prevName } : prev))
    }
  }

  async function handleUpdateDescription() {
    if (!plan) return
    const trimmed = editDescription.trim() || null
    const prevDescription = plan.description
    setPlan((prev) => (prev ? { ...prev, description: trimmed } : prev))
    setEditingDescription(false)
    try {
      await updateMealPlan(plan.id, { description: trimmed })
    } catch {
      setPlan((prev) => (prev ? { ...prev, description: prevDescription } : prev))
    }
  }

  async function handleUpdateMeta() {
    if (!plan) return
    const days = parseInt(editDays) || plan.numberOfDays
    const people = parseInt(editPeople) || plan.numberOfPeople
    const prevDays = plan.numberOfDays
    const prevPeople = plan.numberOfPeople
    setPlan((prev) =>
      prev ? { ...prev, numberOfDays: days, numberOfPeople: people } : prev
    )
    setEditingMeta(false)
    try {
      await updateMealPlan(plan.id, { numberOfDays: days, numberOfPeople: people })
    } catch (err) {
      setPlan((prev) =>
        prev
          ? { ...prev, numberOfDays: prevDays, numberOfPeople: prevPeople }
          : prev
      )
      if (err instanceof Error) {
        const msg = err.message
        toast.error(Array.isArray(msg) ? msg[0] : msg)
      }
    }
  }

  async function handleAddRecipes(recipeIds: string[]) {
    if (!plan) return
    setAddingRecipes(true)
    try {
      const existing = plan.recipes.map((r) => ({ recipeId: r.recipeId, dayNumber: r.dayNumber }))
      const updated = await updateMealPlan(plan.id, {
        recipes: [...existing, ...recipeIds.map((id) => ({ recipeId: id }))],
      })
      setPlan(updated)
      setPickerOpen(false)
      toast.success(t("addedToast"))
    } catch {
      // keep dialog open on error
    } finally {
      setAddingRecipes(false)
    }
  }

  async function handleNewRecipeAdd(recipe: {
    title: string
    text: string
    ingredients: ParsedIngredient[]
  }) {
    if (!plan) return
    try {
      const saved = await saveRecipe({
        title: recipe.title,
        source: "MEAL_PLAN",
        text: recipe.text,
        ...(recipe.ingredients.length > 0 && {
          ingredients: recipe.ingredients.map((ing) => ({
            name: ing.name,
            quantity: ing.quantity ?? 0,
            unit: ing.unit,
            ...(ing.categoryId && ing.categoryId !== NONE_CATEGORY
              ? { categoryId: ing.categoryId }
              : {}),
          })),
        }),
      })
      const existing = plan.recipes.map((r) => ({
        recipeId: r.recipeId,
        dayNumber: r.dayNumber,
      }))
      const updated = await updateMealPlan(plan.id, {
        recipes: [...existing, { recipeId: saved.id }],
      })
      setPlan(updated)
      setCreatingNewRecipe(false)
      toast.success(t("addedToast"))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("unexpectedError"))
    }
  }

  async function handleCreateShoppingList() {
    if (!plan || plan.recipes.length === 0) return
    setCreatingSL(true)
    try {
      const items = plan.recipes.flatMap((recipe) =>
        recipe.ingredients.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          ...(ing.category && { categoryId: ing.category.id }),
        }))
      )
      const list = await createShoppingList({
        name: listName.trim() || plan.name,
        items,
      })
      setCreateListDialogOpen(false)
      router.push(`/shopping-list/${list.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("unexpectedError"))
    } finally {
      setCreatingSL(false)
    }
  }

  async function handleDelete() {
    if (!plan) return
    try {
      await deleteMealPlan(plan.id)
      router.push("/meal-plans")
    } catch {
      // keep on page
    }
  }

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

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/meal-plans">
            <ArrowLeft className="size-4" />
            {t("backToPlans")}
          </Link>
        </Button>
      </div>

      {loading && (
        <EmptyState icon={Loader2} message={t("loading")} />
      )}

      {loadError && (
        <EmptyState icon={RefreshCw} message={t("loadError")} variant="error">
          <Button variant="outline" size="sm" onClick={fetchPlan}>
            {t("retry")}
          </Button>
        </EmptyState>
      )}

      {plan && (
        <>
          <div className="mb-8">
            <PageHeader title={t("detailSubtitle")} />
          </div>

          {/* Metadata card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                {editingName ? (
                  <form
                    className="flex flex-1 items-center gap-1.5"
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleUpdateName()
                    }}
                  >
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 text-sm font-semibold"
                      maxLength={200}
                      autoFocus
                    />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon-xs"
                      disabled={!editName.trim()}
                    >
                      <Check className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setEditingName(false)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </form>
                ) : (
                  <CardTitle
                    className="group/title cursor-pointer text-sm"
                    onClick={() => {
                      setEditingName(true)
                      setEditName(plan.name)
                    }}
                  >
                    {plan.name}
                    <Pencil className="ml-1.5 inline size-3 opacity-0 transition-opacity group-hover/title:opacity-60" />
                  </CardTitle>
                )}
                {!editingName && !editingMeta && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground"
                    onClick={() => {
                      setEditingMeta(true)
                      setEditDays(String(plan.numberOfDays))
                      setEditPeople(String(plan.numberOfPeople))
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                )}
              </div>
              {editingDescription ? (
                <form
                  className="mt-1 flex items-start gap-1.5"
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleUpdateDescription()
                  }}
                >
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder={t("descriptionPlaceholder")}
                    maxLength={500}
                    rows={2}
                    className="text-sm"
                    autoFocus
                  />
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon-xs"
                    >
                      <Check className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setEditingDescription(false)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                </form>
              ) : (
                <p
                  className="group/desc mt-1 cursor-pointer text-sm text-muted-foreground"
                  onClick={() => {
                    setEditingDescription(true)
                    setEditDescription(plan.description ?? "")
                  }}
                >
                  {plan.description || t("descriptionPlaceholder")}
                  <Pencil className="ml-1.5 inline size-3 opacity-0 transition-opacity group-hover/desc:opacity-60" />
                </p>
              )}
              <CardDescription>
                {t("createdAt", {
                  date: formatDate(plan.createdAt, locale),
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {editingMeta ? (
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleUpdateMeta()
                  }}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">{t("daysLabel")}</Label>
                      <Input
                        type="number"
                        min={1}
                        max={7}
                        value={editDays}
                        onChange={(e) => setEditDays(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">{t("peopleLabel")}</Label>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={editPeople}
                        onChange={(e) => setEditPeople(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">
                      <Check className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingMeta(false)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <Badge variant="outline" className="gap-1">
                    <CalendarDays className="size-3" />
                    {t("days", { count: plan.numberOfDays })}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Users className="size-3" />
                    {t("people", { count: plan.numberOfPeople })}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <UtensilsCrossed className="size-3" />
                    {t("recipesCount", { count: plan.recipes.length })}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="mb-4 flex flex-wrap justify-end gap-2">
            {plan.recipes.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setListName(plan.name)
                    setCreateListDialogOpen(true)
                  }}
                >
                  <ShoppingCart className="size-4" />
                  {t("createShoppingList")}
                </Button>
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
                        disabled={creatingSL}
                      >
                        {t("cancelButton")}
                      </Button>
                      <Button
                        onClick={handleCreateShoppingList}
                        disabled={creatingSL}
                      >
                        {creatingSL ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <ShoppingCart className="size-4" />
                        )}
                        {t("createShoppingList")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
              <Plus className="size-4" />
              {t("addRecipe")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCreatingNewRecipe(true)}>
              <Pencil className="size-4" />
              {t("createRecipe")}
            </Button>
          </div>

          <RecipePickerDialog
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            onAdd={handleAddRecipes}
            adding={addingRecipes}
            excludeRecipeIds={plan.recipes.map((r) => r.recipeId)}
          />

          {/* Recipes list grouped by day */}
          {plan.recipes.length > 0 ? (
            <div className="space-y-6">
              {(() => {
                const dayMap = new Map<number, typeof plan.recipes>()
                for (const recipe of plan.recipes) {
                  const day = recipe.dayNumber
                  if (!dayMap.has(day)) dayMap.set(day, [])
                  dayMap.get(day)!.push(recipe)
                }
                const days = [...dayMap.entries()].sort(([a], [b]) => a - b)
                const hasDayGrouping = days.length > 1 || (days.length === 1 && days[0][0] > 0)

                return days.map(([dayNumber, recipes]) => (
                  <div key={dayNumber}>
                    {hasDayGrouping && (
                      <h3 className="mb-2 pl-1 text-sm font-semibold text-muted-foreground">
                        {t("dayLabel", { day: dayNumber })}
                      </h3>
                    )}
                    <div className="space-y-2">
                      {recipes.map((recipe) => {
                        const isExpanded = expandedRecipes.has(recipe.id)
                        return (
                          <Card
                            key={recipe.id}
                            className="cursor-pointer transition-shadow hover:shadow-md hover:border-primary/20"
                            onClick={() => router.push(`/recipes/${recipe.recipeId}`)}
                          >
                            <CardHeader className="py-3">
                              <div className="flex items-center gap-2 min-w-0">
                                {recipe.recipeText && (
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    className="shrink-0 text-muted-foreground"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setExpandedRecipes((prev) => {
                                        const next = new Set(prev)
                                        if (next.has(recipe.id)) next.delete(recipe.id)
                                        else next.add(recipe.id)
                                        return next
                                      })
                                    }}
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
                                    {recipe.recipeTitle}
                                  </CardTitle>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={`shrink-0 text-xs ${SOURCE_STYLES[recipe.recipeSource] ?? ""}`}
                                >
                                  {t(`source.${recipe.recipeSource}`)}
                                </Badge>
                              </div>
                            </CardHeader>
                            {isExpanded && recipe.recipeText && (
                              <CardContent className="pt-0">
                                <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                                  {recipe.recipeText}
                                </div>
                              </CardContent>
                            )}
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                ))
              })()}
            </div>
          ) : (
            <EmptyState icon={UtensilsCrossed} message={t("emptyRecipes")} />
          )}

          {/* Delete plan */}
          <div className="mt-8 flex justify-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                  {t("deletePlan")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("deleteDescription")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("deleteCancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={handleDelete}
                  >
                    {t("deleteConfirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}
    </main>
  )
}
