"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  CalendarDays,
  Check,
  ClipboardList,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  UtensilsCrossed,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Link, useRouter } from "@/i18n/navigation"
import {
  getMealPlans,
  createMealPlan,
  updateMealPlan,
  deleteMealPlan,
} from "@/lib/api"
import type { MealPlanListItem } from "@/lib/types"
import { usePaginatedList } from "@/hooks/use-paginated-list"

function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

export function MealPlansList() {
  const t = useTranslations("MealPlans")
  const locale = useLocale()
  const router = useRouter()

  const {
    items: plans,
    setItems: setPlans,
    loading,
    loadingMore,
    error: loadError,
    hasMore,
    reset: resetPlans,
    sentinelRef,
  } = usePaginatedList<MealPlanListItem>(
    (params, signal) => getMealPlans(params, signal),
    [],
    t("unexpectedError"),
  )

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDays, setNewDays] = useState("1")
  const [newPeople, setNewPeople] = useState("1")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  async function handleUpdateName(id: string) {
    const trimmed = editName.trim()
    if (!trimmed) return
    const prev = plans
    setPlans((p) =>
      p.map((plan) =>
        plan.id === id ? { ...plan, name: trimmed } : plan
      )
    )
    setEditingId(null)
    try {
      await updateMealPlan(id, { name: trimmed })
    } catch {
      setPlans(prev)
    }
  }

  async function handleDelete(id: string) {
    const prev = plans
    setPlans((p) => p.filter((plan) => plan.id !== id))
    try {
      await deleteMealPlan(id)
    } catch {
      setPlans(prev)
    }
  }

  async function handleCreate() {
    setCreating(true)
    setCreateError(null)
    try {
      const created = await createMealPlan({
        ...(newName.trim() && { name: newName.trim() }),
        numberOfDays: parseInt(newDays) || 1,
        numberOfPeople: parseInt(newPeople) || 1,
      })
      setCreateOpen(false)
      setNewName("")
      setNewDays("1")
      setNewPeople("1")
      router.push(`/meal-plans/${created.id}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("unexpectedError")
      setCreateError(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader title={t("heading")} subtitle={t("subtitle")} />

      <div className="mb-6 flex justify-end">
        <Dialog open={createOpen} onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) {
            setCreateError(null)
            setNewName("")
            setNewDays("1")
            setNewPeople("1")
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              {t("createButton")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("createTitle")}</DialogTitle>
              <DialogDescription>{t("createDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  maxLength={200}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">{t("daysLabel")}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={7}
                    value={newDays}
                    onChange={(e) => setNewDays(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">{t("peopleLabel")}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={newPeople}
                    onChange={(e) => setNewPeople(e.target.value)}
                  />
                </div>
              </div>
              {createError && (
                <p className="text-sm text-destructive">{createError}</p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={creating}>
                {creating && <Loader2 className="size-4 animate-spin" />}
                {creating ? t("creating") : t("createConfirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {loading && (
          <EmptyState icon={Loader2} message={t("loading")} />
        )}

        {loadError && (
          <EmptyState icon={RefreshCw} message={t("loadError")} variant="error">
            <Button variant="outline" size="sm" onClick={resetPlans}>
              {t("retry")}
            </Button>
          </EmptyState>
        )}

        {!loading && !loadError && plans.length === 0 && (
          <EmptyState icon={ClipboardList} message={t("emptyPlans")} />
        )}

        {plans.map((plan) => (
          <Link
            key={plan.id}
            href={`/meal-plans/${plan.id}`}
            className="block"
          >
            <Card className="transition-shadow hover:shadow-md hover:border-primary/20">
              <CardHeader>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    {editingId === plan.id ? (
                      <form
                        className="flex items-center gap-1.5"
                        onSubmit={(e) => {
                          e.preventDefault()
                          handleUpdateName(plan.id)
                        }}
                        onClick={(e) => e.preventDefault()}
                      >
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-7 text-sm"
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
                        {plan.name}
                      </CardTitle>
                    )}
                    <CardDescription className="mt-0.5 flex flex-wrap items-center gap-2">
                      <span>
                        {t("createdAt", {
                          date: formatDate(plan.createdAt, locale),
                        })}
                      </span>
                      <Badge variant="outline" className="gap-1 text-xs">
                        <CalendarDays className="size-3" />
                        {t("days", { count: plan.numberOfDays })}
                      </Badge>
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Users className="size-3" />
                        {t("people", { count: plan.numberOfPeople })}
                      </Badge>
                      <Badge variant="outline" className="gap-1 text-xs">
                        <UtensilsCrossed className="size-3" />
                        {t("recipesCount", { count: plan.recipesCount })}
                      </Badge>
                    </CardDescription>
                  </div>

                  {editingId !== plan.id && (
                    <div
                      className="flex shrink-0 gap-1"
                      onClick={(e) => e.preventDefault()}
                    >
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground"
                        onClick={() => {
                          setEditingId(plan.id)
                          setEditName(plan.name)
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
                              onClick={() => handleDelete(plan.id)}
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
          </Link>
        ))}

        {hasMore && <div ref={sentinelRef} />}
        {loadingMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </main>
  )
}
