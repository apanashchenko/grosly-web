"use client"

import { useCallback, useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  ArrowLeft,
  Check,
  ClipboardList,
  Loader2,
  Pencil,
  RefreshCw,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { MealPlanPickerDialog } from "@/components/meal-plans/meal-plan-picker-dialog"
import { Link, useRouter } from "@/i18n/navigation"
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
import {
  getSavedRecipe,
  createShoppingList,
  deleteSavedRecipe,
  getMealPlan,
  updateMealPlan,
  updateRecipe,
} from "@/lib/api"
import { UNITS, type SavedRecipeResponse } from "@/lib/types"
import { useCategoryLocalization } from "@/hooks/use-category-localization"
import { useCategories } from "@/hooks/use-categories"

function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

const SOURCE_STYLES: Record<string, string> = {
  PARSED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  GENERATED: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
  SUGGESTED: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
}

interface Props {
  recipeId: string
}

export function SavedRecipeDetail({ recipeId }: Props) {
  const router = useRouter()
  const t = useTranslations("SavedRecipes")
  const tList = useTranslations("ShoppingList")
  const tPlans = useTranslations("MealPlans")
  const locale = useLocale()
  const { localizeCategoryName } = useCategoryLocalization()
  const { categoryMap } = useCategories()

  const [recipe, setRecipe] = useState<SavedRecipeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [planPickerOpen, setPlanPickerOpen] = useState(false)
  const [removingFromPlanId, setRemovingFromPlanId] = useState<string | null>(null)

  // Recipe editing state
  const [editingTitle, setEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editingText, setEditingText] = useState(false)
  const [editText, setEditText] = useState("")
  const [saving, setSaving] = useState(false)
  const [creatingList, setCreatingList] = useState(false)

  const fetchRecipe = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await getSavedRecipe(recipeId)
      setRecipe(data)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t("unexpectedError"))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId])

  useEffect(() => {
    fetchRecipe()
  }, [fetchRecipe])

  function formatQty(quantity: number, unit: string): string {
    const label = UNITS.includes(unit as (typeof UNITS)[number])
      ? tList(`units.${unit}`)
      : unit
    return label ? `${quantity} ${label}` : `${quantity}`
  }

  // --- Recipe editing handlers ---

  function startEditTitle() {
    if (!recipe) return
    setEditTitle(recipe.title)
    setEditingTitle(true)
  }

  function startEditText() {
    if (!recipe) return
    setEditText(recipe.text)
    setEditingText(true)
  }

  async function handleSaveTitle() {
    if (!recipe) return
    const trimmed = editTitle.trim()
    if (!trimmed || trimmed === recipe.title) {
      setEditingTitle(false)
      return
    }
    const prev = recipe.title
    setRecipe((r) => (r ? { ...r, title: trimmed } : r))
    setEditingTitle(false)
    setSaving(true)
    try {
      await updateRecipe(recipeId, { title: trimmed })
    } catch {
      setRecipe((r) => (r ? { ...r, title: prev } : r))
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveText() {
    if (!recipe) return
    const trimmed = editText.trim()
    if (!trimmed || trimmed === recipe.text) {
      setEditingText(false)
      return
    }
    const prev = recipe.text
    setRecipe((r) => (r ? { ...r, text: trimmed } : r))
    setEditingText(false)
    setSaving(true)
    try {
      await updateRecipe(recipeId, { text: trimmed })
    } catch {
      setRecipe((r) => (r ? { ...r, text: prev } : r))
    } finally {
      setSaving(false)
    }
  }

  // --- Create shopping list from ingredients ---

  async function handleCreateShoppingList() {
    if (!recipe || recipe.ingredients.length === 0) return
    setCreatingList(true)
    try {
      const newList = await createShoppingList({
        name: recipe.title,
        items: recipe.ingredients.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          ...(ing.category?.id ? { categoryId: ing.category.id } : {}),
        })),
      })
      router.push(`/shopping-list/${newList.id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("unexpectedError")
      toast.error(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setCreatingList(false)
    }
  }

  async function handleRemoveFromPlan(planId: string) {
    if (!recipe) return
    setRemovingFromPlanId(planId)
    try {
      const plan = await getMealPlan(planId)
      const remaining = plan.recipes
        .filter((r) => r.recipeId !== recipeId)
        .map((r) => r.recipeId)
      await updateMealPlan(planId, { recipes: remaining })
      setRecipe((prev) =>
        prev
          ? { ...prev, mealPlans: prev.mealPlans.filter((p) => p.id !== planId) }
          : prev
      )
      toast.success(t("removedFromPlanToast"))
    } catch {
      // keep as-is
    } finally {
      setRemovingFromPlanId(null)
    }
  }

  async function handleDelete() {
    if (!recipe) return
    try {
      await deleteSavedRecipe(recipeId)
      router.push("/recipes")
    } catch {
      // keep on page
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
          {t("back")}
        </Button>
      </div>

      {loading && (
        <EmptyState icon={Loader2} message={t("loading")} />
      )}

      {loadError && (
        <EmptyState icon={RefreshCw} message={t("loadError")} variant="error">
          <Button variant="outline" size="sm" onClick={fetchRecipe}>
            {t("retry")}
          </Button>
        </EmptyState>
      )}

      {recipe && (
        <>
          <PageHeader title={t("recipeTextTitle")} />

          <MealPlanPickerDialog
            open={planPickerOpen}
            onOpenChange={setPlanPickerOpen}
            recipeId={recipeId}
            excludePlanIds={recipe.mealPlans.map((p) => p.id)}
            onAdded={fetchRecipe}
          />

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex justify-end">
                  <Badge
                    variant="outline"
                    className={`text-xs ${SOURCE_STYLES[recipe.source] ?? ""}`}
                  >
                    {t(`source.${recipe.source}`)}
                  </Badge>
                </div>
                {editingTitle ? (
                  <form
                    className="flex items-center gap-1.5"
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleSaveTitle()
                    }}
                  >
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-8 text-sm font-semibold"
                      maxLength={300}
                      autoFocus
                    />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon-xs"
                      disabled={!editTitle.trim()}
                    >
                      <Check className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setEditingTitle(false)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </form>
                ) : (
                  <CardTitle
                    className="group/title cursor-pointer"
                    onClick={() => startEditTitle()}
                  >
                    {recipe.title}
                    <Pencil className="ml-1.5 inline size-3 opacity-0 transition-opacity group-hover/title:opacity-60" />
                  </CardTitle>
                )}
                <CardDescription>
                  {t("createdAt", {
                    date: formatDate(recipe.createdAt, locale),
                  })}
                </CardDescription>
                {recipe.mealPlans.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs text-muted-foreground">{t("inMealPlans")}:</span>
                    {recipe.mealPlans.map((plan) => (
                      <Badge key={plan.id} variant="outline" className="gap-1 text-xs">
                        <Link href={`/meal-plans/${plan.id}`} className="flex items-center gap-1 hover:underline">
                          <ClipboardList className="size-3" />
                          {plan.name}
                        </Link>
                        <button
                          type="button"
                          disabled={removingFromPlanId !== null}
                          onClick={() => handleRemoveFromPlan(plan.id)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-muted transition-colors disabled:opacity-50"
                        >
                          {removingFromPlanId === plan.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <X className="size-3" />
                          )}
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {editingText ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="min-h-[200px] text-sm leading-relaxed"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingText(false)}
                      >
                        {t("editCancel")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveText}
                        disabled={!editText.trim()}
                      >
                        {t("editSave")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {recipe.text}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ingredients card */}
            <Card>
              <CardHeader>
                <CardTitle>{t("ingredientsTitle")}</CardTitle>
                {recipe.ingredients.length > 0 && (
                  <CardDescription>
                    {t("ingredientsCount", { count: recipe.ingredients.length })}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {recipe.ingredients.length > 0 ? (
                  <>
                    <div className="divide-y">
                      {recipe.ingredients.map((ing) => (
                        <div key={ing.id} className="flex items-center gap-2 py-2.5">
                          <span className="min-w-0 flex-1 font-medium truncate">
                            {ing.name}
                          </span>
                          <Badge variant="secondary" className="shrink-0 tabular-nums">
                            {formatQty(ing.quantity, ing.unit)}
                          </Badge>
                          {ing.category && (
                            <Badge variant="outline" className="shrink-0">
                              {ing.category.icon ? `${ing.category.icon} ` : ""}
                              {localizeCategoryName(categoryMap.get(ing.category.id) ?? ing.category)}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("noIngredients")}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setPlanPickerOpen(true)}
                  >
                    <ClipboardList className="size-4" />
                    {tPlans("addToMealPlan")}
                  </Button>
                  {!editingText && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={startEditText}
                      disabled={saving}
                    >
                      <Pencil className="size-4" />
                      {t("editRecipe")}
                    </Button>
                  )}
                </div>
                {recipe.ingredients.length > 0 && (
                  <Button
                    onClick={handleCreateShoppingList}
                    disabled={creatingList}
                    className="w-full"
                    size="lg"
                  >
                    {creatingList ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="size-4" />
                    )}
                    {t("createShoppingList")}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Delete recipe */}
          <div className="mt-8 flex justify-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                  {t("deleteRecipe")}
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
