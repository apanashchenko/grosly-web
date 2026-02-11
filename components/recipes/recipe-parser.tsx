"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { ChevronDown, LoaderCircle, ShoppingCart, Check, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { UNITS, type ParsedIngredient, type Category } from "@/lib/types"
import { parseRecipe, createShoppingList, getCategories } from "@/lib/api"
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

const MAX_LENGTH = 2000

export function RecipeParser() {
  const t = useTranslations("RecipeParser")
  const tList = useTranslations("ShoppingList")
  const { localizeCategoryName } = useCategoryLocalization()
  const [recipeText, setRecipeText] = useState("")
  const [ingredients, setIngredients] = useState<ParsedIngredient[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [recipeTextOpen, setRecipeTextOpen] = useState(true)
  const [ingredientsOpen, setIngredientsOpen] = useState(true)
  const [listName, setListName] = useState("")
  const [savingList, setSavingList] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const charCount = recipeText.length
  const isOverLimit = charCount > MAX_LENGTH
  const isSubmitDisabled = charCount < 3 || isOverLimit || isLoading

  const unitOptions = UNITS.map((u) => ({ value: u, label: tList(`units.${u}`) }))
  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: localizeCategoryName(c),
    icon: c.icon,
  }))

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {})
  }, [])

  async function handleSubmit() {
    setIsLoading(true)
    setError(null)
    setIngredients([])
    setSavedSuccess(false)
    setListName("")

    try {
      const data = await parseRecipe(recipeText)
      setIngredients(data.ingredients)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("unexpectedError")
      )
    } finally {
      setIsLoading(false)
    }
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

  async function handleCreateList() {
    setSavingList(true)
    setError(null)
    try {
      await createShoppingList({
        ...(listName.trim() ? { name: listName.trim() } : {}),
        items: ingredients.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity ?? 0,
          unit: ing.unit,
          ...(ing.categoryId ? { categoryId: ing.categoryId } : {}),
        })),
      })
      setSavedSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError"))
    } finally {
      setSavingList(false)
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <PageHeader title={t("heading")} subtitle={t("subtitle")} />

      <div className="grid items-start gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t("recipeTextTitle")}</CardTitle>
          <CardDescription>
            {t("recipeTextDescription")}
          </CardDescription>
          <CardAction>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRecipeTextOpen((v) => !v)}
            >
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  recipeTextOpen && "rotate-180"
                )}
              />
            </Button>
          </CardAction>
        </CardHeader>
        {recipeTextOpen && (
          <>
            <CardContent className="space-y-2">
              <Textarea
                value={recipeText}
                onChange={(e) => setRecipeText(e.target.value)}
                placeholder={t("placeholder")}
                rows={8}
                className="min-h-[200px] resize-y"
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
              <Button onClick={handleSubmit} disabled={isSubmitDisabled} size="lg">
                {isLoading && <LoaderCircle className="animate-spin" />}
                {isLoading ? t("parsing") : t("parseButton")}
              </Button>
            </CardFooter>
          </>
        )}
      </Card>

      <div className="space-y-6">
      {ingredients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("ingredientsTitle")}</CardTitle>
            <CardDescription>
              {t("ingredientsFound", { count: ingredients.length })}
            </CardDescription>
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
              <CardContent>
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
              </CardContent>
              <CardFooter className="flex-col items-stretch gap-3">
                {savedSuccess ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="gap-1">
                      <Check className="size-3" />
                      {t("savedSuccess")}
                    </Badge>
                    <Button variant="link" size="sm" asChild>
                      <Link href="/shopping-list">
                        <ShoppingCart className="size-4" />
                        {t("viewShoppingLists")}
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      value={listName}
                      onChange={(e) => setListName(e.target.value)}
                      placeholder={t("listNamePlaceholder")}
                    />
                    <Button
                      onClick={handleCreateList}
                      disabled={savingList}
                      className="w-full"
                    >
                      {savingList ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <ShoppingCart />
                      )}
                      {savingList ? t("saving") : t("createShoppingList")}
                    </Button>
                  </>
                )}
              </CardFooter>
            </>
          )}
        </Card>
      )}
      </div>
      </div>
    </main>
  )
}
