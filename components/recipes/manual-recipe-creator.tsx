"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import {
  ChevronDown,
  LoaderCircle,
  Plus,
  Trash2,
  Bookmark,
  Check,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { UNITS, type ParsedIngredient, type Category } from "@/lib/types"
import { parseRecipe, getCategories, saveRecipe } from "@/lib/api"
import { NONE_CATEGORY } from "@/lib/constants"
import { useCategoryLocalization } from "@/hooks/use-category-localization"
import { PageHeader } from "@/components/shared/page-header"
import { Link } from "@/i18n/navigation"
import { SaveRecipeDialog } from "@/components/recipes/save-recipe-dialog"
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

export function ManualRecipeCreator() {
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

  // Save state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
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
        note: null,
        categoryId: newCategoryId === NONE_CATEGORY ? null : newCategoryId,
      },
    ])
    setNewName("")
    setNewQuantity("")
    setNewUnit("pcs")
    setNewCategoryId(NONE_CATEGORY)
  }

  function handleDeleteIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  function handleQuantityChange(index: number, value: string) {
    const num = value === "" ? null : Number(value)
    if (value !== "" && isNaN(num!)) return
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, quantity: num } : ing))
    )
  }

  function handleUnitChange(index: number, value: string) {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, unit: value } : ing))
    )
  }

  function handleCategoryChange(index: number, value: string) {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, categoryId: value === NONE_CATEGORY ? null : value } : ing))
    )
  }

  async function handleSaveRecipe(opts: {
    title: string
    isAddToShoppingList: boolean
    shoppingListName: string
  }) {
    setSavingRecipe(true)
    try {
      const fullText = recipeTitle.trim()
        ? `${recipeTitle.trim()}\n\n${recipeText}`
        : recipeText

      await saveRecipe({
        title: opts.title || recipeTitle.trim() || undefined,
        source: "MANUAL",
        text: fullText,
        isAddToShoppingList: opts.isAddToShoppingList || undefined,
        ...(opts.isAddToShoppingList && ingredients.length > 0
          ? {
              items: ingredients.map((ing) => ({
                name: ing.name,
                quantity: ing.quantity ?? 0,
                unit: ing.unit,
                ...(ing.categoryId ? { categoryId: ing.categoryId } : {}),
              })),
              shoppingListName: opts.shoppingListName || undefined,
            }
          : {}),
      })
      setRecipeSaved(true)
      setSaveDialogOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError"))
    } finally {
      setSavingRecipe(false)
    }
  }

  const canSave = recipeText.trim().length >= 3 && !isOverLimit

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <PageHeader title={t("heading")} subtitle={t("subtitle")} />

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
                    <Button type="submit" size="icon" disabled={!newName.trim()}>
                      <Plus />
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
                </form>

                {/* Ingredients list */}
                {ingredients.length > 0 && (
                  <div className="divide-y">
                    {ingredients.map((ingredient, index) => (
                      <div key={index} className="space-y-1.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 font-medium truncate">
                            {ingredient.name}
                          </span>
                          {ingredient.note && (
                            <Badge variant="outline" className="shrink-0">{ingredient.note}</Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteIngredient(index)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            value={ingredient.quantity ?? ""}
                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                            min={0}
                            step="any"
                            className="w-16 h-7 text-sm"
                          />
                          <Select value={ingredient.unit} onValueChange={(v) => handleUnitChange(index, v)}>
                            <SelectTrigger className="w-20 h-7 text-sm">
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
                          <Select
                            value={ingredient.categoryId ?? NONE_CATEGORY}
                            onValueChange={(v) => handleCategoryChange(index, v)}
                          >
                            <SelectTrigger className="flex-1 h-7 text-sm">
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {error && ingredients.length > 0 && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </CardContent>
              <CardFooter>
                <div className="w-full">
                  {recipeSaved ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="gap-1">
                        <Check className="size-3" />
                        {tSave("recipeSaved")}
                      </Badge>
                      <Button variant="link" size="sm" asChild>
                        <Link href="/recipes">
                          <Bookmark className="size-4" />
                          {tSave("viewSavedRecipes")}
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setSaveDialogOpen(true)}
                      disabled={!canSave}
                      className="w-full"
                      size="lg"
                    >
                      <Bookmark />
                      {t("saveRecipe")}
                    </Button>
                  )}

                  <SaveRecipeDialog
                    open={saveDialogOpen}
                    onOpenChange={setSaveDialogOpen}
                    onSave={handleSaveRecipe}
                    saving={savingRecipe}
                    defaultTitle={recipeTitle.trim()}
                    hasItems={ingredients.length > 0}
                  />
                </div>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </main>
  )
}
