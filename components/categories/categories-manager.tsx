"use client"

import { useCallback, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Check, Loader2, Pencil, Plus, RefreshCw, Tag, Trash2, X } from "lucide-react"
import { useCategoryLocalization } from "@/hooks/use-category-localization"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Separator } from "@/components/ui/separator"
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/api"
import type { Category } from "@/lib/types"

export function CategoriesManager() {
  const t = useTranslations("Categories")
  const { localizeCategoryName } = useCategoryLocalization()

  // --- State ---
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Add form
  const [newName, setNewName] = useState("")
  const [newIcon, setNewIcon] = useState("")
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editIcon, setEditIcon] = useState("")
  const [editError, setEditError] = useState<string | null>(null)

  // --- Fetch ---
  const fetchCategories = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await getCategories()
      setCategories(data)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t("loadError"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // --- Create ---
  async function handleCreate() {
    const trimmed = newName.trim()
    if (!trimmed) return
    setAdding(true)
    setAddError(null)
    try {
      const created = await createCategory({
        name: trimmed,
        icon: newIcon.trim() || undefined,
      })
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName("")
      setNewIcon("")
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("unexpectedError")
      setAddError(msg)
    } finally {
      setAdding(false)
    }
  }

  // --- Update ---
  async function handleUpdate(id: string) {
    const trimmed = editName.trim()
    if (!trimmed) return
    setEditError(null)
    try {
      const updated = await updateCategory(id, {
        name: trimmed,
        icon: editIcon.trim() || undefined,
      })
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? updated : c)).sort((a, b) => a.name.localeCompare(b.name))
      )
      setEditingId(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("unexpectedError")
      setEditError(msg)
    }
  }

  // --- Delete ---
  async function handleDelete(id: string) {
    const removed = categories.find((c) => c.id === id)
    setCategories((prev) => prev.filter((c) => c.id !== id))
    try {
      await deleteCategory(id)
    } catch {
      if (removed) {
        setCategories((prev) => [...prev, removed].sort((a, b) => a.name.localeCompare(b.name)))
      }
    }
  }

  function startEdit(category: Category) {
    setEditingId(category.id)
    setEditName(category.name)
    setEditIcon(category.icon ?? "")
    setEditError(null)
  }

  const systemCategories = categories.filter((c) => !c.isCustom)
  const customCategories = categories.filter((c) => c.isCustom)

  // --- Loading ---
  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <PageHeader title={t("heading")} subtitle={t("subtitle")} />
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-muted/20 py-20 text-muted-foreground">
          <Loader2 className="mb-4 size-12 animate-spin text-muted-foreground/30" />
          <p className="text-base font-medium">{t("loading")}</p>
        </div>
      </main>
    )
  }

  // --- Load error ---
  if (loadError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <PageHeader title={t("heading")} subtitle={t("subtitle")} />
        <EmptyState icon={RefreshCw} message={t("loadError")} variant="error">
          <Button variant="outline" onClick={fetchCategories}>
            <RefreshCw className="size-4" />
            {t("retry")}
          </Button>
        </EmptyState>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader title={t("heading")} subtitle={t("subtitle")} />

      <div className="space-y-6">
        {/* Add category form */}
        <Card>
          <CardHeader>
            <CardTitle>{t("addTitle")}</CardTitle>
            <CardDescription>{t("addDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleCreate()
              }}
              className="flex gap-2"
            >
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("namePlaceholder")}
                className="flex-1"
                maxLength={100}
              />
              <Input
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                placeholder={t("iconPlaceholder")}
                className="w-20"
                maxLength={50}
              />
              <Button type="submit" disabled={!newName.trim() || adding}>
                {adding ? <Loader2 className="animate-spin" /> : <Plus />}
                {t("addButton")}
              </Button>
            </form>
            {addError && (
              <p className="mt-2 text-sm text-destructive">{addError}</p>
            )}
          </CardContent>
        </Card>

        {/* Custom categories */}
        <div>
          <h2 className="mb-3 text-sm font-medium tracking-wide text-muted-foreground uppercase">
            {t("customSection")}
          </h2>
          {customCategories.length === 0 ? (
            <EmptyState icon={Tag} message={t("emptyCustom")} />
          ) : (
            <div className="space-y-2">
              {customCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center gap-3 rounded-lg border border-border/60 px-4 py-3 shadow-sm transition-all hover:shadow-md hover:border-primary/20"
                >
                  {editingId === category.id ? (
                    <>
                      <Input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleUpdate(category.id)
                          } else if (e.key === "Escape") {
                            e.preventDefault()
                            setEditingId(null)
                          }
                        }}
                        className="flex-1 h-8 text-sm"
                        maxLength={100}
                      />
                      <Input
                        value={editIcon}
                        onChange={(e) => setEditIcon(e.target.value)}
                        placeholder={t("iconPlaceholder")}
                        className="w-16 h-8 text-sm"
                        maxLength={50}
                      />
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleUpdate(category.id)}
                        disabled={!editName.trim()}
                        className="text-primary hover:text-primary"
                      >
                        <Check className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-lg">{category.icon ?? ""}</span>
                      <span className="flex-1 font-medium">{category.name}</span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => startEdit(category)}
                        className="text-muted-foreground hover:text-foreground"
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
                            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("deleteDescription")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("deleteCancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={() => handleDelete(category.id)}
                            >
                              {t("deleteConfirm")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              ))}
              {editError && (
                <p className="text-sm text-destructive">{editError}</p>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* System categories */}
        <div>
          <h2 className="mb-3 text-sm font-medium tracking-wide text-muted-foreground uppercase">
            {t("systemSection")}
          </h2>
          <div className="space-y-2">
            {systemCategories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-3 rounded-lg border border-border/60 px-4 py-3 shadow-sm"
              >
                <span className="text-lg">{category.icon ?? ""}</span>
                <span className="flex-1 font-medium">{localizeCategoryName(category)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
