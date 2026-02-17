"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  Bookmark,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Link, useRouter } from "@/i18n/navigation"
import { getSavedRecipes } from "@/lib/api"
import type { RecipeSource, SavedRecipeListItem } from "@/lib/types"
import { usePaginatedList } from "@/hooks/use-paginated-list"

const RECIPE_SOURCES: RecipeSource[] = ["PARSED", "PARSED_IMAGE", "GENERATED", "SUGGESTED", "MANUAL", "MEAL_PLAN"]

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
  PARSED_IMAGE: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800",
  GENERATED: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
  SUGGESTED: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  MANUAL: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
  MEAL_PLAN: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
}

export function SavedRecipesList() {
  const t = useTranslations("SavedRecipes")
  const locale = useLocale()
  const router = useRouter()

  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(null)

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(value.trim())
    }, 400)
  }, [])

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [])

  const {
    items: recipes,
    setItems: setRecipes,
    loading,
    loadingMore,
    error: loadError,
    hasMore,
    reset: resetRecipes,
    sentinelRef,
  } = usePaginatedList<SavedRecipeListItem>(
    (params, signal) => {
      const extra: Record<string, unknown> = {}
      if (searchQuery) extra.search = searchQuery
      if (sourceFilter !== "all") extra.filter = { source: `$eq:${sourceFilter}` }
      return getSavedRecipes({ ...params, ...extra }, signal)
    },
    [searchQuery, sourceFilter],
    t("unexpectedError"),
  )

  const hasActiveFilters = !!searchQuery || sourceFilter !== "all"

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader title={t("heading")} subtitle={t("subtitle")} />

      <div className="mb-6 flex justify-end">
        <Button asChild>
          <Link href="/recipes/new">
            <Plus className="size-4" />
            {t("createRecipe")}
          </Link>
        </Button>
      </div>

      {/* Search + filter */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => { setSearchInput(""); setSearchQuery("") }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[140px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAll")}</SelectItem>
            {RECIPE_SOURCES.map((s) => (
              <SelectItem key={s} value={s}>{t(`source.${s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {loading && (
          <EmptyState icon={Loader2} message={t("loading")} />
        )}

        {loadError && (
          <EmptyState icon={RefreshCw} message={t("loadError")} variant="error">
            <Button variant="outline" size="sm" onClick={resetRecipes}>
              {t("retry")}
            </Button>
          </EmptyState>
        )}

        {!loading && !loadError && recipes.length === 0 && (
          <EmptyState
            icon={hasActiveFilters ? Search : Bookmark}
            message={hasActiveFilters ? t("noSearchResults") : t("emptyRecipes")}
          />
        )}

        {recipes.map((recipe) => (
          <Card
            key={recipe.id}
            className="cursor-pointer transition-shadow hover:shadow-md hover:border-primary/20"
            onClick={() => router.push(`/recipes/${recipe.id}`)}
          >
            <CardHeader className="py-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm">
                    {recipe.title}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {t("createdAt", {
                      date: formatDate(recipe.createdAt, locale),
                    })}
                  </CardDescription>
                </div>
              </div>
              <CardAction>
                <Badge
                  variant="outline"
                  className={`text-xs ${SOURCE_STYLES[recipe.source] ?? ""}`}
                >
                  {t(`source.${recipe.source}`)}
                </Badge>
              </CardAction>
            </CardHeader>
          </Card>
        ))}

        {/* Infinite scroll sentinel */}
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
