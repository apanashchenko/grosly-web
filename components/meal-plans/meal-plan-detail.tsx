"use client"

import { useCallback, useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  Loader2,
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
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Link, useRouter } from "@/i18n/navigation"
import { getMealPlan, updateMealPlan, deleteMealPlan } from "@/lib/api"
import type { MealPlanResponse } from "@/lib/types"

const SOURCE_STYLES: Record<string, string> = {
  PARSED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  GENERATED: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
  SUGGESTED: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  MEAL_PLAN: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
}

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

  // Edit meta state
  const [editingMeta, setEditingMeta] = useState(false)
  const [editDays, setEditDays] = useState("")
  const [editPeople, setEditPeople] = useState("")

  // Add recipe dialog
  const [pickerOpen, setPickerOpen] = useState(false)
  const [addingRecipes, setAddingRecipes] = useState(false)

  // Expanded recipes
  const [expandedRecipes, setExpandedRecipes] = useState<Set<string>>(new Set())

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
    } catch {
      setPlan((prev) =>
        prev
          ? { ...prev, numberOfDays: prevDays, numberOfPeople: prevPeople }
          : prev
      )
    }
  }

  async function handleRemoveRecipe(recipeId: string) {
    if (!plan) return
    const prevRecipes = plan.recipes
    const remaining = plan.recipes.filter((r) => r.recipeId !== recipeId)
    setPlan((prev) => (prev ? { ...prev, recipes: remaining } : prev))
    try {
      const updated = await updateMealPlan(plan.id, {
        recipes: remaining.map((r) => r.recipeId),
      })
      setPlan(updated)
    } catch {
      setPlan((prev) => (prev ? { ...prev, recipes: prevRecipes } : prev))
    }
  }

  async function handleAddRecipes(recipeIds: string[]) {
    if (!plan) return
    setAddingRecipes(true)
    try {
      const existingIds = plan.recipes.map((r) => r.recipeId)
      const updated = await updateMealPlan(plan.id, {
        recipes: [...existingIds, ...recipeIds],
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

  async function handleDelete() {
    if (!plan) return
    try {
      await deleteMealPlan(plan.id)
      router.push("/meal-plans")
    } catch {
      // keep on page
    }
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
                  {plan.shoppingListId && (
                    <Link href={`/shopping-list/${plan.shoppingListId}`}>
                      <Badge variant="outline" className="gap-1 text-primary cursor-pointer">
                        <ShoppingCart className="size-3" />
                        {t("viewShoppingList")}
                      </Badge>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add recipe button */}
          <div className="mb-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
              <Plus className="size-4" />
              {t("addRecipe")}
            </Button>
          </div>

          <RecipePickerDialog
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            onAdd={handleAddRecipes}
            adding={addingRecipes}
            excludeRecipeIds={plan.recipes.map((r) => r.recipeId)}
          />

          {/* Recipes list */}
          <div className="space-y-2">
            {plan.recipes.map((recipe) => {
              const isExpanded = expandedRecipes.has(recipe.id)
              return (
                <Card key={recipe.id}>
                  <CardHeader className="py-3">
                    <div className="flex items-center gap-2">
                      {recipe.recipeText && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="shrink-0 text-muted-foreground"
                          onClick={() =>
                            setExpandedRecipes((prev) => {
                              const next = new Set(prev)
                              if (next.has(recipe.id)) next.delete(recipe.id)
                              else next.add(recipe.id)
                              return next
                            })
                          }
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
                        <CardTitle className="truncate text-sm">
                          <Link
                            href={`/recipes/${recipe.recipeId}`}
                            className="hover:text-primary hover:underline transition-colors"
                          >
                            {recipe.recipeTitle}
                          </Link>
                        </CardTitle>
                      </div>
                      <Badge
                        variant="outline"
                        className={`shrink-0 text-xs ${SOURCE_STYLES[recipe.recipeSource] ?? ""}`}
                      >
                        {t(`source.${recipe.recipeSource}`)}
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {t("removeRecipeTitle")}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("removeRecipeDescription")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              {t("removeRecipeCancel")}
                            </AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={() => handleRemoveRecipe(recipe.recipeId)}
                            >
                              {t("removeRecipeConfirm")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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

          {plan.recipes.length === 0 && (
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
