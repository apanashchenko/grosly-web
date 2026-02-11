"use client"

import { useCallback, useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  Bookmark,
  Check,
  Loader2,
  Merge,
  Pencil,
  RefreshCw,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { Link, useRouter } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import {
  getSavedRecipes,
  updateRecipeTitle,
  deleteSavedRecipe,
  combineShoppingLists,
} from "@/lib/api"
import type { SavedRecipeListItem } from "@/lib/types"

function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

const SOURCE_STYLES: Record<string, string> = {
  PARSED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  GENERATED: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
  SUGGESTED: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
}

export function SavedRecipesList() {
  const t = useTranslations("SavedRecipes")
  const locale = useLocale()
  const router = useRouter()

  const [recipes, setRecipes] = useState<SavedRecipeListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")

  // Combine mode state
  const [combineMode, setCombineMode] = useState(false)
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set())
  const [combineName, setCombineName] = useState("")
  const [combining, setCombining] = useState(false)
  const [combineError, setCombineError] = useState<string | null>(null)

  const recipesWithList = recipes.filter((r) => r.shoppingListId)

  const fetchRecipes = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await getSavedRecipes()
      setRecipes(data)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t("unexpectedError"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchRecipes()
  }, [fetchRecipes])

  async function handleUpdateTitle(id: string) {
    const trimmed = editTitle.trim()
    if (!trimmed) return
    const prev = recipes
    setRecipes((r) =>
      r.map((recipe) =>
        recipe.id === id ? { ...recipe, title: trimmed } : recipe
      )
    )
    setEditingId(null)
    try {
      await updateRecipeTitle(id, { title: trimmed })
    } catch {
      setRecipes(prev)
    }
  }

  async function handleDelete(id: string) {
    const prev = recipes
    setRecipes((r) => r.filter((recipe) => recipe.id !== id))
    try {
      await deleteSavedRecipe(id)
    } catch {
      setRecipes(prev)
    }
  }

  // Combine mode handlers
  function toggleSelectRecipe(recipeId: string) {
    setSelectedRecipeIds((prev) => {
      const next = new Set(prev)
      if (next.has(recipeId)) {
        next.delete(recipeId)
      } else {
        next.add(recipeId)
      }
      return next
    })
  }

  function exitCombineMode() {
    setCombineMode(false)
    setSelectedRecipeIds(new Set())
    setCombineName("")
    setCombineError(null)
  }

  async function handleCombine() {
    const listIds = recipes
      .filter((r) => selectedRecipeIds.has(r.id) && r.shoppingListId)
      .map((r) => r.shoppingListId!)

    if (listIds.length < 2) return

    setCombining(true)
    setCombineError(null)
    try {
      await combineShoppingLists({
        listIds,
        ...(combineName.trim() && { name: combineName.trim() }),
      })
      exitCombineMode()
      router.push("/shopping-list")
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("combineError")
      setCombineError(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setCombining(false)
    }
  }

  const selectedWithListCount = recipes.filter(
    (r) => selectedRecipeIds.has(r.id) && r.shoppingListId
  ).length

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader title={t("heading")} subtitle={t("subtitle")} />

      {!loading && !loadError && recipesWithList.length >= 2 && (
        <div className="mb-6 flex justify-end">
          {combineMode ? (
            <Button variant="outline" onClick={exitCombineMode}>
              <X className="size-4" />
              {t("combineCancel")}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setCombineMode(true)}>
              <Merge className="size-4" />
              {t("combineButton")}
            </Button>
          )}
        </div>
      )}

      <div className="space-y-4">
        {loading && (
          <EmptyState icon={Loader2} message={t("loading")} />
        )}

        {loadError && (
          <EmptyState icon={RefreshCw} message={t("loadError")} variant="error">
            <Button variant="outline" size="sm" onClick={fetchRecipes}>
              {t("retry")}
            </Button>
          </EmptyState>
        )}

        {!loading && !loadError && recipes.length === 0 && (
          <EmptyState icon={Bookmark} message={t("emptyRecipes")} />
        )}

        {recipes.map((recipe) => {
          const hasShoppingList = !!recipe.shoppingListId
          const isSelected = selectedRecipeIds.has(recipe.id)
          const isSelectableInCombine = combineMode && hasShoppingList

          const cardContent = (
            <Card
              className={cn(
                "transition-shadow hover:shadow-md hover:border-primary/20",
                combineMode && !hasShoppingList && "opacity-50",
                isSelectableInCombine && "cursor-pointer",
                isSelectableInCombine && isSelected && "border-primary bg-primary/5"
              )}
              onClick={isSelectableInCombine ? (e) => {
                e.preventDefault()
                toggleSelectRecipe(recipe.id)
              } : undefined}
            >
              <CardHeader>
                <div className="flex items-start gap-2">
                  {combineMode && (
                    <div
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                        !hasShoppingList && "border-muted-foreground/15 bg-muted/30",
                        hasShoppingList && isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : hasShoppingList
                            ? "border-muted-foreground/30"
                            : ""
                      )}
                    >
                      {isSelected && hasShoppingList && <Check className="size-3" />}
                    </div>
                  )}

                  <Badge
                    variant="outline"
                    className={`shrink-0 text-xs ${SOURCE_STYLES[recipe.source] ?? ""}`}
                  >
                    {t(`source.${recipe.source}`)}
                  </Badge>

                  <div className="min-w-0 flex-1">
                    {editingId === recipe.id && !combineMode ? (
                      <form
                        className="flex items-center gap-1.5"
                        onSubmit={(e) => {
                          e.preventDefault()
                          handleUpdateTitle(recipe.id)
                        }}
                        onClick={(e) => e.preventDefault()}
                      >
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="h-7 text-sm"
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
                          onClick={(e) => {
                            e.preventDefault()
                            setEditingId(null)
                          }}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </form>
                    ) : (
                      <CardTitle className="truncate text-base">
                        {recipe.title}
                      </CardTitle>
                    )}
                    <CardDescription className="mt-0.5 flex items-center gap-2">
                      <span>{t("createdAt", {
                        date: formatDate(recipe.createdAt, locale),
                      })}</span>
                      {hasShoppingList && (
                        <ShoppingCart className="size-3 text-primary" />
                      )}
                    </CardDescription>
                  </div>

                  {editingId !== recipe.id && !combineMode && (
                    <div
                      className="flex shrink-0 gap-1"
                      onClick={(e) => e.preventDefault()}
                    >
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground"
                        onClick={() => {
                          setEditingId(recipe.id)
                          setEditTitle(recipe.title)
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {t("deleteTitle")}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("deleteDescription")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              {t("deleteCancel")}
                            </AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={() => handleDelete(recipe.id)}
                            >
                              {t("deleteConfirm")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </CardHeader>
            </Card>
          )

          if (combineMode) {
            return <div key={recipe.id}>{cardContent}</div>
          }

          return (
            <Link
              key={recipe.id}
              href={`/recipes/${recipe.id}`}
              className="block"
            >
              {cardContent}
            </Link>
          )
        })}
      </div>

      {combineMode && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-4 shadow-lg">
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            {combineError && (
              <p className="text-sm text-destructive">{combineError}</p>
            )}
            <div className="flex items-center gap-2">
              <Input
                value={combineName}
                onChange={(e) => setCombineName(e.target.value)}
                placeholder={t("combineNamePlaceholder")}
                maxLength={200}
                className="flex-1"
              />
              <Button
                onClick={handleCombine}
                disabled={selectedWithListCount < 2 || combining}
                className="shrink-0 shadow-md"
              >
                {combining && <Loader2 className="size-4 animate-spin" />}
                {combining
                  ? t("combining")
                  : t("combineSelected", { count: selectedWithListCount })}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
