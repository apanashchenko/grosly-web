"use client"

import { useCallback, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2, Plus, RefreshCw, Users } from "lucide-react"
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
import { SpaceCard } from "./space-card"
import { InvitationCard } from "./invitation-card"
import {
  getSpaces,
  createSpace,
  getMyInvitations,
  respondToInvitation,
} from "@/lib/api"
import type { SpaceResponse, InvitationResponse } from "@/lib/types"
import { useAuth } from "@/lib/auth"

export function SpacesManager() {
  const t = useTranslations("Spaces")
  const { user } = useAuth()

  const [spaces, setSpaces] = useState<SpaceResponse[]>([])
  const [invitations, setInvitations] = useState<InvitationResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Create form
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [spacesData, invitationsData] = await Promise.all([
        getSpaces(),
        getMyInvitations().catch(() => [] as InvitationResponse[]),
      ])
      setSpaces(spacesData)
      setInvitations(invitationsData.filter((i) => i.status === "PENDING"))
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t("loadError"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // --- Create space ---
  async function handleCreate() {
    const trimmed = newName.trim()
    if (!trimmed) return
    setCreating(true)
    setCreateError(null)
    try {
      const created = await createSpace({
        name: trimmed,
        description: newDescription.trim() || undefined,
      })
      setSpaces((prev) => [created, ...prev])
      setNewName("")
      setNewDescription("")
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : t("unexpectedError"))
    } finally {
      setCreating(false)
    }
  }

  // --- Respond to invitation ---
  async function handleRespondInvitation(id: string, accept: boolean) {
    await respondToInvitation(id, { action: accept ? "ACCEPT" : "DECLINE" })
    setInvitations((prev) => prev.filter((i) => i.id !== id))
    if (accept) {
      // Refetch spaces to include newly joined space
      const spacesData = await getSpaces().catch(() => spaces)
      setSpaces(spacesData)
    }
  }

  // --- Callbacks for SpaceCard ---
  function handleSpaceUpdated(updated: SpaceResponse) {
    setSpaces((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }

  function handleSpaceDeleted(id: string) {
    setSpaces((prev) => prev.filter((s) => s.id !== id))
  }

  // --- Loading ---
  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <PageHeader title={t("heading")} subtitle={t("subtitle")} />
        <EmptyState icon={Loader2} message={t("loading")} className="[&_svg]:animate-spin" />
      </main>
    )
  }

  // --- Load error ---
  if (loadError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <PageHeader title={t("heading")} subtitle={t("subtitle")} />
        <EmptyState icon={RefreshCw} message={t("loadError")} variant="error">
          <Button variant="outline" onClick={fetchData} className="mt-4">
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
        {/* Pending invitations */}
        {invitations.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-medium tracking-wide text-muted-foreground uppercase">
              {t("invitationsTitle")}
            </h2>
            <div className="space-y-2">
              {invitations.map((invitation) => (
                <InvitationCard
                  key={invitation.id}
                  invitation={invitation}
                  onRespond={handleRespondInvitation}
                />
              ))}
            </div>
          </div>
        )}

        {/* Create space form */}
        <Card>
          <CardHeader>
            <CardTitle>{t("createTitle")}</CardTitle>
            <CardDescription>{t("createDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleCreate()
              }}
              className="space-y-2"
            >
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  className="flex-1"
                  maxLength={200}
                />
                <Button type="submit" disabled={!newName.trim() || creating}>
                  {creating ? <Loader2 className="animate-spin" /> : <Plus />}
                  {creating ? t("creating") : t("createButton")}
                </Button>
              </div>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                maxLength={500}
              />
              {createError && (
                <p className="text-sm text-destructive">{createError}</p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Spaces list */}
        {spaces.length === 0 ? (
          <EmptyState icon={Users} message={t("emptySpaces")} />
        ) : (
          <div className="space-y-3">
            {spaces.map((space) => (
              <SpaceCard
                key={space.id}
                space={space}
                currentUserId={user?.id ?? ""}
                onUpdated={handleSpaceUpdated}
                onDeleted={handleSpaceDeleted}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
