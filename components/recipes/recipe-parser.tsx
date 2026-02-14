"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useTranslations } from "next-intl"
import { ChevronDown, LoaderCircle, ShoppingCart, Check, Trash2, Bookmark, ImagePlus, FileImage } from "lucide-react"
import { cn } from "@/lib/utils"
import { UNITS, type ParsedIngredient, type Category } from "@/lib/types"
import { parseRecipe, parseRecipeImage, createShoppingList, getCategories, saveRecipe } from "@/lib/api"
import { NONE_CATEGORY } from "@/lib/constants"
import { useCategoryLocalization } from "@/hooks/use-category-localization"
import { PageHeader } from "@/components/shared/page-header"
import { Link } from "@/i18n/navigation"
import { SaveRecipeDialog } from "@/components/recipes/save-recipe-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  const tSave = useTranslations("SavedRecipes")
  const tList = useTranslations("ShoppingList")
  const { localizeCategoryName } = useCategoryLocalization()
  const [inputMode, setInputMode] = useState<"text" | "image">("text")
  const [parsedFromImage, setParsedFromImage] = useState(false)
  const [recipeText, setRecipeText] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [ingredients, setIngredients] = useState<ParsedIngredient[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [recipeTextOpen, setRecipeTextOpen] = useState(true)
  const [ingredientsOpen, setIngredientsOpen] = useState(true)
  const [listName, setListName] = useState("")
  const [savingList, setSavingList] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [createListDialogOpen, setCreateListDialogOpen] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [savingRecipe, setSavingRecipe] = useState(false)
  const [recipeSaved, setRecipeSaved] = useState(false)

  const charCount = recipeText.length
  const isOverLimit = charCount > MAX_LENGTH
  const hasParsed = ingredients.length > 0
  const isTextSubmitDisabled = charCount < 3 || isOverLimit || isLoading || hasParsed
  const isImageSubmitDisabled = !imageFile || isLoading || hasParsed

  const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

  function handleFileSelect(file: File | null) {
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("JPEG, PNG, WebP only")
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Max 10 MB")
      return
    }
    setError(null)
    setImageFile(file)
    const url = URL.createObjectURL(file)
    setImagePreview(url)
  }

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    setIngredients([])
    setRecipeText("")
    setSavedSuccess(false)
    setRecipeSaved(false)
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }, [])

  const unitOptions = UNITS.map((u) => ({ value: u, label: tList(`units.${u}`) }))
  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: localizeCategoryName(c),
    icon: c.icon,
  }))

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {})
  }, [])

  async function handleSaveRecipe(opts: { title: string }) {
    setSavingRecipe(true)
    try {
      await saveRecipe({
        title: opts.title || undefined,
        source: parsedFromImage ? "PARSED_IMAGE" : "PARSED",
        text: recipeText,
        ingredients: ingredients.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity ?? 0,
          unit: ing.unit,
          ...(ing.categoryId ? { categoryId: ing.categoryId } : {}),
          ...(ing.note ? { note: ing.note } : {}),
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

  async function handleSubmit() {
    setIsLoading(true)
    setError(null)
    setIngredients([])
    setSavedSuccess(false)
    setRecipeSaved(false)
    setListName("")

    const isImage = inputMode === "image" && !!imageFile
    setParsedFromImage(isImage)

    try {
      const data = isImage
        ? await parseRecipeImage(imageFile)
        : await parseRecipe(recipeText)
      setIngredients(data.ingredients)
      if (isImage && data.recipeText) {
        setRecipeText(data.recipeText)
        setInputMode("text")
      }
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

  function handleNoteChange(index: number, value: string) {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, note: value || null } : ing))
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
          ...(ing.note ? { note: ing.note } : {}),
        })),
      })
      setSavedSuccess(true)
      setCreateListDialogOpen(false)
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
          <CardTitle>
            {inputMode === "text" ? t("recipeTextTitle") : t("imageUploadTitle")}
          </CardTitle>
          <CardDescription>
            {inputMode === "text" ? t("recipeTextDescription") : t("imageUploadDescription")}
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
            <CardContent className="space-y-3">
              {/* Mode tabs */}
              <div className="flex gap-1 rounded-lg bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setInputMode("text")}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    inputMode === "text"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t("tabText")}
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("image")}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    inputMode === "image"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t("tabImage")}
                </button>
              </div>

              {inputMode === "text" ? (
                <>
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
                </>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                  />

                  {imagePreview ? (
                    <div className="space-y-2">
                      <div className="relative overflow-hidden rounded-lg border">
                        <img
                          src={imagePreview}
                          alt=""
                          className="max-h-[300px] w-full object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-sm text-muted-foreground">
                          {t("imageSelected", { name: imageFile?.name ?? "" })}
                        </p>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              clearImage()
                              fileInputRef.current?.click()
                            }}
                          >
                            {t("changeImage")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={clearImage}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={cn(
                        "flex min-h-[200px] w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 transition-colors",
                        isDragging
                          ? "border-primary bg-primary/5"
                          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <div className="rounded-full bg-muted p-3">
                        <ImagePlus className="size-6 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">{t("imageDropzone")}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{t("imageFormats")}</p>
                      </div>
                    </button>
                  )}

                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                </>
              )}
            </CardContent>
            <CardFooter>
              {inputMode === "text" ? (
                <Button onClick={handleSubmit} disabled={isTextSubmitDisabled} size="lg">
                  {isLoading && <LoaderCircle className="animate-spin" />}
                  {isLoading ? t("parsing") : t("parseButton")}
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isImageSubmitDisabled} size="lg">
                  {isLoading ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <FileImage className="size-4" />
                  )}
                  {isLoading ? t("parsing") : t("parseImageButton")}
                </Button>
              )}
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
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="shrink-0 text-destructive/60 hover:text-destructive"
                          onClick={() => handleDeleteIngredient(index)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                      <Input
                        value={ingredient.note ?? ""}
                        onChange={(e) => handleNoteChange(index, e.target.value)}
                        placeholder={t("notePlaceholder")}
                        className="h-7 text-sm"
                      />
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
                    variant="outline"
                    onClick={() => setSaveDialogOpen(true)}
                    className="w-full"
                  >
                    <Bookmark className="size-4" />
                    {tSave("saveRecipe")}
                  </Button>
                )}

                <SaveRecipeDialog
                  open={saveDialogOpen}
                  onOpenChange={setSaveDialogOpen}
                  onSave={handleSaveRecipe}
                  saving={savingRecipe}
                />

                <div className="border-t pt-3">
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
                    <Button
                      onClick={() => setCreateListDialogOpen(true)}
                      className="w-full"
                    >
                      <ShoppingCart />
                      {t("createShoppingList")}
                    </Button>
                  )}
                </div>

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
                          <ShoppingCart />
                        )}
                        {savingList ? t("saving") : t("createShoppingList")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
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
