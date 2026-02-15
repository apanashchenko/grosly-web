"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import {
  ChevronDown,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  Bookmark,
  Check,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ParsedIngredient } from "@/lib/types"
import { UNITS, type Category } from "@/lib/types"
import { parseRecipe, getCategories, saveRecipe } from "@/lib/api"
import { NONE_CATEGORY } from "@/lib/constants"
import { useCategoryLocalization } from "@/hooks/use-category-localization"
import { PageHeader } from "@/components/shared/page-header"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const MAX_LENGTH = 5000

interface ManualRecipeCreatorProps {
  mode?: "standalone" | "meal-plan"
  onAdd?: (recipe: { title: string; text: string; ingredients: ParsedIngredient[] }) => void
  onCancel?: () => void
}

export function ManualRecipeCreator({
  mode = "standalone",
  onAdd,
  onCancel,
}: ManualRecipeCreatorProps) {
  const t = useTranslations("ManualRecipe")
  const tList = useTranslations("ShoppingList")
  const tSave = useTranslations("SavedRecipes")
  const { localizeCategoryName } = useCategoryLocalization()

  const [recipeTitle, setRecipeTitle] = useState("")
  const [recipeText, setRecipeText] = useState("")
  const [ingredients, setIngredients] = useState<ParsedIngredient[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [ingredientsOpen, setIngredientsOpen] = useState(true)

  // Add ingredient form
  const [newName, setNewName] = useState("")
  const [newQuantity, setNewQuantity] = useState("")
  const [newUnit, setNewUnit] = useState("pcs")
  const [newCategoryId, setNewCategoryId] = useState(NONE_CATEGORY)
  const [newNote, setNewNote] = useState("")
  const [isEditing, setIsEditing] = useState(false)

  // Save state
  const [savingRecipe, setSavingRecipe] = useState(false)
  const [recipeSaved, setRecipeSaved] = useState(false)

  const charCount = recipeText.length
  const isOverLimit = charCount > MAX_LENGTH

  const unitOptions = UNITS.map((u) => ({ value: u, label: tList(`units.${u}`) }))
  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: localizeCategoryName(c),
    icon: c.icon,
  }))

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {})
  }, [])

  async function handleExtractIngredients() {
    if (recipeText.trim().length < 3) return
    setExtracting(true)
    setError(null)
    try {
      const data = await parseRecipe(recipeText)
      setIngredients((prev) => [...prev, ...data.ingredients])
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError"))
    } finally {
      setExtracting(false)
    }
  }

  function handleAddIngredient() {
    const trimmedName = newName.trim()
    if (!trimmedName) return
    setIngredients((prev) => [
      ...prev,
      {
        name: trimmedName,
        quantity: newQuantity ? Number(newQuantity) : null,
        unit: newUnit || "pcs",
        localizedUnit: "",
        note: newNote.trim() || null,
        categoryId: newCategoryId === NONE_CATEGORY ? null : newCategoryId,
      },
    ])
    resetForm()
  }

  function resetForm() {
    setNewName("")
    setNewQuantity("")
    setNewUnit("pcs")
    setNewCategoryId(NONE_CATEGORY)
    setNewNote("")
    setIsEditing(false)
  }

  function handleDeleteIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  function handleEditIngredient(index: number) {
    const ing = ingredients[index]
    setNewName(ing.name)
    setNewQuantity(ing.quantity !== null ? String(ing.quantity) : "")
    setNewUnit(ing.unit || "pcs")
    setNewCategoryId(ing.categoryId ?? NONE_CATEGORY)
    setNewNote(ing.note ?? "")
    setIsEditing(true)
    handleDeleteIngredient(index)
  }

  async function handleSaveRecipe() {
    if (!canSave) return
    setSavingRecipe(true)
    try {
      const title = recipeTitle.trim()
      const fullText = `${title}\n\n${recipeText}`

      await saveRecipe({
        title,
        source: "MANUAL",
        text: fullText,
        ...(ingredients.length > 0
          ? {
              ingredients: ingredients.map((ing) => ({
                name: ing.name,
                quantity: ing.quantity ?? 0,
                unit: ing.unit,
                ...(ing.categoryId ? { categoryId: ing.categoryId } : {}),
                ...(ing.note ? { note: ing.note } : {}),
              })),
            }
          : {}),
      })
      setRecipeSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError"))
    } finally {
      setSavingRecipe(false)
    }
  }

  const canSave = recipeTitle.trim().length > 0 && recipeText.trim().length >= 3 && !isOverLimit
  const canAddToMealPlan = canSave

  function handleAddToMealPlan() {
    if (!canAddToMealPlan || !onAdd) return
    const fullText = recipeTitle.trim()
      ? `${recipeTitle.trim()}\n\n${recipeText}`
      : recipeText
    onAdd({ title: recipeTitle.trim() || recipeText.trim().split("\n")[0].slice(0, 100), text: fullText, ingredients })
  }

  const Wrapper = mode === "standalone" ? "main" : "div"

  return (
    <Wrapper className={mode === "standalone" ? "mx-auto max-w-2xl px-4 py-12" : undefined}>
      {mode === "standalone" && (
        <PageHeader title={t("heading")} subtitle={t("subtitle")} />
      )}

      <div className="space-y-6">
        {/* Recipe text card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("recipeTextTitle")}</CardTitle>
            <CardDescription>{t("recipeTextDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={recipeTitle}
              onChange={(e) => setRecipeTitle(e.target.value)}
              placeholder={t("recipeTitlePlaceholder")}
              maxLength={100}
            />
            <Textarea
              value={recipeText}
              onChange={(e) => setRecipeText(e.target.value)}
              placeholder={t("recipeTextPlaceholder")}
              rows={8}
              className="min-h-[200px] resize-y"
            />
            <div className="flex items-center justify-between">
              {error && !ingredients.length ? (
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
        </Card>

        {/* Ingredients card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("ingredientsTitle")}</CardTitle>
            {ingredients.length > 0 && (
              <CardDescription>
                {t("ingredientsFound", { count: ingredients.length })}
              </CardDescription>
            )}
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
                {/* Extract button */}
                <Button
                  variant="outline"
                  onClick={handleExtractIngredients}
                  disabled={extracting || recipeText.trim().length < 3}
                  className="w-full"
                >
                  {extracting ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {extracting ? t("extracting") : t("extractButton")}
                </Button>

                {/* Manual add form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleAddIngredient()
                  }}
                  className="space-y-2"
                >
                  <div className="flex gap-2">
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={t("ingredientNamePlaceholder")}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={!newName.trim()}>
                      {isEditing ? <Check /> : <Plus />}
                      {isEditing ? tList("saveItemButton") : t("addButton")}
                    </Button>
                  </div>
                  <div className="flex gap-1.5">
                    <Input
                      type="number"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(e.target.value)}
                      placeholder={tList("qtyPlaceholder")}
                      min={0}
                      step="any"
                      className="w-16 text-sm"
                    />
                    <Select value={newUnit} onValueChange={setNewUnit}>
                      <SelectTrigger className="w-20 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {unitOptions.map((u) => (
                            <SelectItem key={u.value} value={u.value}>
                              {u.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {categoryOptions.length > 0 && (
                      <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                        <SelectTrigger className="flex-1 text-sm">
                          <SelectValue placeholder={t("categoryPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value={NONE_CATEGORY}>—</SelectItem>
                            {categoryOptions.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.icon ? `${c.icon} ${c.label}` : c.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <Input
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder={t("notePlaceholder")}
                    className="text-sm"
                  />
                </form>

                {/* Ingredients list */}
                {ingredients.length > 0 && (
                  <div className="divide-y">
                    {ingredients.map((ingredient, index) => {
                      const qty = ingredient.quantity !== null
                        ? (ingredient.unit ? `${ingredient.quantity} ${tList(`units.${ingredient.unit}`)}` : `${ingredient.quantity}`)
                        : null
                      const cat = ingredient.categoryId
                        ? categoryOptions.find((c) => c.value === ingredient.categoryId)
                        : null
                      return (
                        <div key={index}>
                          <div className="flex w-full items-center gap-2 py-3">
                            <span className="flex flex-1 min-w-0">
                              <span className="font-medium truncate">{ingredient.name}</span>
                            </span>
                            <div className="ml-auto shrink-0 flex flex-col items-end gap-0.5">
                              {cat && (
                                <Badge variant="outline" className="text-[11px]">{cat.icon ? `${cat.icon} ${cat.label}` : cat.label}</Badge>
                              )}
                              <div className="flex items-center gap-1">
                                {qty && <Badge variant="secondary">{qty}</Badge>}
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => handleEditIngredient(index)}
                                  className="text-muted-foreground/40 hover:text-muted-foreground"
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => handleDeleteIngredient(index)}
                                  className="text-destructive/60 hover:text-destructive"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          {ingredient.note && (
                            <p className="pb-2 px-1 text-xs text-muted-foreground leading-snug">
                              {ingredient.note}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {error && ingredients.length > 0 && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </CardContent>
              <CardFooter>
                <div className="w-full space-y-2">
                  {mode === "meal-plan" ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={onCancel}
                      >
                        {t("cancelAddToMealPlan")}
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleAddToMealPlan}
                        disabled={!canAddToMealPlan}
                      >
                        <Plus className="size-4" />
                        {t("addToMealPlan")}
                      </Button>
                    </div>
                  ) : (
                    <>
                      {recipeSaved ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="gap-1">
                            <Check className="size-3" />
                            {tSave("recipeSaved")}
                          </Badge>
                          <Button variant="link" size="sm" asChild>
                            <Link href="/recipes" prefetch={false}>
                              <Bookmark className="size-4" />
                              {tSave("viewSavedRecipes")}
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={handleSaveRecipe}
                          disabled={!canSave || savingRecipe}
                          className="w-full"
                          size="lg"
                        >
                          {savingRecipe ? (
                            <LoaderCircle className="animate-spin" />
                          ) : (
                            <Bookmark />
                          )}
                          {savingRecipe ? t("saving") : t("saveRecipe")}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </Wrapper>
  )
}
