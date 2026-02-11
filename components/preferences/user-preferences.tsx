"use client"

import { useCallback, useEffect, useState } from "react"
import { useMessages, useTranslations } from "next-intl"
import { Check, Loader2, RefreshCw } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Combobox,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  useComboboxAnchor,
} from "@/components/ui/combobox"
import {
  getAllergies,
  getDietaryRestrictions,
  getUserPreferences,
  updateUserPreferences,
} from "@/lib/api"
import type {
  Allergy,
  DietaryRestriction,
  UserPreferencesResponse,
  UpdateUserPreferencesRequest,
} from "@/lib/types"

export function UserPreferences() {
  const t = useTranslations("Preferences")
  const messages = useMessages()

  // Slug → localized name lookup (falls back to API name for unknown slugs)
  const prefsMessages = messages.Preferences as Record<string, unknown>
  const allergyNames = (prefsMessages?.allergyNames ?? {}) as Record<
    string,
    string
  >
  const restrictionNames = (prefsMessages?.restrictionNames ?? {}) as Record<
    string,
    string
  >

  function localizeAllergy(allergy: Allergy) {
    return allergyNames[allergy.slug] ?? allergy.name
  }

  function localizeRestriction(restriction: DietaryRestriction) {
    return restrictionNames[restriction.slug] ?? restriction.name
  }

  // --- Reference data ---
  const [allergies, setAllergies] = useState<Allergy[]>([])
  const [dietaryRestrictions, setDietaryRestrictions] = useState<
    DietaryRestriction[]
  >([])

  // --- Server baseline (for dirty checking) ---
  const [serverPrefs, setServerPrefs] =
    useState<UserPreferencesResponse | null>(null)

  // --- Form state ---
  const [selectedAllergyIds, setSelectedAllergyIds] = useState<string[]>([])
  const [selectedRestrictionIds, setSelectedRestrictionIds] = useState<
    string[]
  >([])
  const [defaultServings, setDefaultServings] = useState(4)
  const [customNotes, setCustomNotes] = useState("")

  // --- UI state ---
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedSuccess, setSavedSuccess] = useState(false)

  // --- Combobox anchors ---
  const allergiesAnchor = useComboboxAnchor()
  const restrictionsAnchor = useComboboxAnchor()

  // --- Load data on mount ---
  const fetchData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [allergiesData, restrictionsData, prefsData] = await Promise.all([
        getAllergies(),
        getDietaryRestrictions(),
        getUserPreferences(),
      ])
      setAllergies(allergiesData)
      setDietaryRestrictions(restrictionsData)
      setServerPrefs(prefsData)
      setSelectedAllergyIds(prefsData.allergies.map((a) => a.id))
      setSelectedRestrictionIds(
        prefsData.dietaryRestrictions.map((r) => r.id)
      )
      setDefaultServings(prefsData.defaultServings)
      setCustomNotes(prefsData.customNotes ?? "")
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t("loadError"))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // --- Dirty checking ---
  const hasChanges = (() => {
    if (!serverPrefs) return false
    const serverAllergyIds = serverPrefs.allergies.map((a) => a.id).sort()
    const serverRestrictionIds = serverPrefs.dietaryRestrictions
      .map((r) => r.id)
      .sort()
    const currentAllergyIds = [...selectedAllergyIds].sort()
    const currentRestrictionIds = [...selectedRestrictionIds].sort()

    const serverNotes = serverPrefs.customNotes ?? ""

    return (
      defaultServings !== serverPrefs.defaultServings ||
      customNotes !== serverNotes ||
      JSON.stringify(serverAllergyIds) !==
        JSON.stringify(currentAllergyIds) ||
      JSON.stringify(serverRestrictionIds) !==
        JSON.stringify(currentRestrictionIds)
    )
  })()

  // --- Build PATCH payload with only changed fields ---
  function buildPatchPayload(): UpdateUserPreferencesRequest | null {
    if (!serverPrefs) return null
    const payload: UpdateUserPreferencesRequest = {}
    let hasField = false

    if (defaultServings !== serverPrefs.defaultServings) {
      payload.defaultServings = defaultServings
      hasField = true
    }

    const serverAllergyIds = serverPrefs.allergies.map((a) => a.id).sort()
    const currentAllergyIds = [...selectedAllergyIds].sort()
    if (
      JSON.stringify(serverAllergyIds) !== JSON.stringify(currentAllergyIds)
    ) {
      payload.allergyIds = selectedAllergyIds
      hasField = true
    }

    const serverRestrictionIds = serverPrefs.dietaryRestrictions
      .map((r) => r.id)
      .sort()
    const currentRestrictionIds = [...selectedRestrictionIds].sort()
    if (
      JSON.stringify(serverRestrictionIds) !==
      JSON.stringify(currentRestrictionIds)
    ) {
      payload.dietaryRestrictionIds = selectedRestrictionIds
      hasField = true
    }

    const serverNotes = serverPrefs.customNotes ?? ""
    if (customNotes !== serverNotes) {
      payload.customNotes = customNotes || null
      hasField = true
    }

    return hasField ? payload : null
  }

  // --- Save handler ---
  async function handleSave() {
    const payload = buildPatchPayload()
    if (!payload) return

    setSaving(true)
    setError(null)
    setSavedSuccess(false)

    try {
      const updated = await updateUserPreferences(payload)
      setServerPrefs(updated)
      setSelectedAllergyIds(updated.allergies.map((a) => a.id))
      setSelectedRestrictionIds(
        updated.dietaryRestrictions.map((r) => r.id)
      )
      setDefaultServings(updated.defaultServings)
      setCustomNotes(updated.customNotes ?? "")
      setSavedSuccess(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("unexpectedError"))
    } finally {
      setSaving(false)
    }
  }

  // Reset success badge when user makes more changes
  useEffect(() => {
    if (hasChanges) {
      setSavedSuccess(false)
    }
  }, [hasChanges])

  // --- Loading state ---
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

  // --- Error state ---
  if (loadError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <PageHeader title={t("heading")} subtitle={t("subtitle")} />
        <EmptyState icon={RefreshCw} message={t("loadError")} variant="error">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="size-4" />
            {t("retry")}
          </Button>
        </EmptyState>
      </main>
    )
  }

  // --- Main render ---
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader title={t("heading")} subtitle={t("subtitle")} />

      <div className="space-y-6">
        {/* Allergies */}
        <Card>
          <CardHeader>
            <CardTitle>{t("allergiesTitle")}</CardTitle>
            <CardDescription>{t("allergiesDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Combobox
              multiple
              value={selectedAllergyIds}
              onValueChange={setSelectedAllergyIds}
            >
              <ComboboxChips ref={allergiesAnchor}>
                {selectedAllergyIds.map((id) => {
                  const allergy = allergies.find((a) => a.id === id)
                  return (
                    <ComboboxChip key={id}>
                      {allergy ? localizeAllergy(allergy) : id}
                    </ComboboxChip>
                  )
                })}
                <ComboboxChipsInput
                  placeholder={t("allergiesPlaceholder")}
                />
              </ComboboxChips>
              <ComboboxContent anchor={allergiesAnchor}>
                <ComboboxList>
                  {allergies.map((allergy) => (
                    <ComboboxItem key={allergy.id} value={allergy.id}>
                      {localizeAllergy(allergy)}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
                <ComboboxEmpty>{t("allergiesEmpty")}</ComboboxEmpty>
              </ComboboxContent>
            </Combobox>
          </CardContent>
        </Card>

        {/* Dietary Restrictions */}
        <Card>
          <CardHeader>
            <CardTitle>{t("dietaryRestrictionsTitle")}</CardTitle>
            <CardDescription>
              {t("dietaryRestrictionsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Combobox
              multiple
              value={selectedRestrictionIds}
              onValueChange={setSelectedRestrictionIds}
            >
              <ComboboxChips ref={restrictionsAnchor}>
                {selectedRestrictionIds.map((id) => {
                  const restriction = dietaryRestrictions.find(
                    (r) => r.id === id
                  )
                  return (
                    <ComboboxChip key={id}>
                      {restriction
                        ? localizeRestriction(restriction)
                        : id}
                    </ComboboxChip>
                  )
                })}
                <ComboboxChipsInput
                  placeholder={t("dietaryRestrictionsPlaceholder")}
                />
              </ComboboxChips>
              <ComboboxContent anchor={restrictionsAnchor}>
                <ComboboxList>
                  {dietaryRestrictions.map((restriction) => (
                    <ComboboxItem
                      key={restriction.id}
                      value={restriction.id}
                    >
                      {localizeRestriction(restriction)}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
                <ComboboxEmpty>
                  {t("dietaryRestrictionsEmpty")}
                </ComboboxEmpty>
              </ComboboxContent>
            </Combobox>
          </CardContent>
        </Card>

        {/* Default Servings */}
        <Card>
          <CardHeader>
            <CardTitle>{t("defaultServingsTitle")}</CardTitle>
            <CardDescription>
              {t("defaultServingsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={String(defaultServings)}
              onValueChange={(val) => setDefaultServings(Number(val))}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {t("servings", { count: n })}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Custom Notes */}
        <Card>
          <CardHeader>
            <CardTitle>{t("customNotesTitle")}</CardTitle>
            <CardDescription>
              {t("customNotesDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Textarea
                value={customNotes}
                onChange={(e) =>
                  setCustomNotes(e.target.value.slice(0, 500))
                }
                placeholder={t("customNotesPlaceholder")}
                maxLength={500}
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">
                {t("customNotesCount", { count: customNotes.length })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save section */}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="shadow-md hover:shadow-lg"
            size="lg"
          >
            {saving && <Loader2 className="animate-spin" />}
            {saving ? t("saving") : t("saveButton")}
          </Button>

          {savedSuccess && (
            <Badge variant="default" className="gap-1">
              <Check className="size-3" />
              {t("savedSuccess")}
            </Badge>
          )}

          {!hasChanges && !savedSuccess && serverPrefs && (
            <span className="text-sm text-muted-foreground">
              {t("noChanges")}
            </span>
          )}
        </div>
      </div>
    </main>
  )
}
