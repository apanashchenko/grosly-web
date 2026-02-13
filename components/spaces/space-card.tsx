"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import {
  Check,
  ChevronDown,
  Loader2,
  Mail,
  Pencil,
  Trash2,
  User as UserIcon,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
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
import {
  updateSpace,
  deleteSpace,
  inviteToSpace,
  removeSpaceMember,
  getSpaceInvitations,
  deleteSpaceInvitation,
} from "@/lib/api"
import type { SpaceResponse, SpaceInvitation } from "@/lib/types"

interface SpaceCardProps {
  space: SpaceResponse
  currentUserId: string
  onUpdated: (space: SpaceResponse) => void
  onDeleted: (id: string) => void
}

export function SpaceCard({ space, currentUserId, onUpdated, onDeleted }: SpaceCardProps) {
  const t = useTranslations("Spaces")

  const [open, setOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(space.name)
  const [descDraft, setDescDraft] = useState(space.description ?? "")

  // Invite
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [pendingInvites, setPendingInvites] = useState<SpaceInvitation[]>([])

  const isOwner = space.members.some(
    (m) => m.userId === currentUserId && m.role === "OWNER"
  )

  // Fetch pending invitations when card opens (owner only)
  useEffect(() => {
    if (!open || !isOwner) return
    getSpaceInvitations(space.id)
      .then(setPendingInvites)
      .catch(() => {})
  }, [open, isOwner, space.id])

  // --- Edit name/description ---
  async function handleSaveName() {
    const trimmed = nameDraft.trim()
    if (!trimmed || trimmed === space.name && descDraft === (space.description ?? "")) {
      setEditingName(false)
      return
    }
    try {
      const updated = await updateSpace(space.id, {
        name: trimmed,
        description: descDraft.trim() || undefined,
      })
      onUpdated(updated)
      setEditingName(false)
    } catch {
      // keep editing open
    }
  }

  // --- Delete space ---
  async function handleDelete() {
    try {
      await deleteSpace(space.id)
      onDeleted(space.id)
    } catch {
      // no-op
    }
  }

  // --- Invite ---
  async function handleInvite() {
    const email = inviteEmail.trim()
    if (!email) return
    setInviting(true)
    try {
      await inviteToSpace(space.id, { email })
      toast.success(t("inviteSent"))
      setInviteEmail("")
      getSpaceInvitations(space.id).then(setPendingInvites).catch(() => {})
    } catch (e) {
      const msg = e instanceof Error ? e.message : ""
      if (msg.includes("already a member")) {
        toast.error(t("alreadyMember"))
      } else {
        toast.error(t("inviteError"))
      }
    } finally {
      setInviting(false)
    }
  }

  // --- Cancel invitation ---
  async function handleCancelInvitation(invitationId: string) {
    try {
      await deleteSpaceInvitation(space.id, invitationId)
      setPendingInvites((prev) => prev.filter((inv) => inv.id !== invitationId))
    } catch {
      // no-op
    }
  }

  // --- Remove member ---
  async function handleRemoveMember(userId: string) {
    try {
      await removeSpaceMember(space.id, userId)
      onUpdated({
        ...space,
        members: space.members.filter((m) => m.userId !== userId),
      })
    } catch {
      // no-op
    }
  }

  return (
    <Card className="transition-all hover:shadow-md hover:border-primary/20">
      <CardHeader className="cursor-pointer pb-3" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-3">
          {editingName ? (
            <div
              className="flex flex-1 flex-wrap items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleSaveName()
                  } else if (e.key === "Escape") {
                    e.preventDefault()
                    setEditingName(false)
                    setNameDraft(space.name)
                    setDescDraft(space.description ?? "")
                  }
                }}
                className="h-8 flex-1 text-sm font-semibold"
                maxLength={200}
              />
              <Input
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                className="h-8 flex-1 text-sm"
                maxLength={500}
              />
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleSaveName}
                className="text-primary hover:text-primary"
              >
                <Check className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  setEditingName(false)
                  setNameDraft(space.name)
                  setDescDraft(space.description ?? "")
                }}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{space.name}</h3>
                {space.description && (
                  <p className="text-sm text-muted-foreground truncate">
                    {space.description}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className="shrink-0">
                {t("memberCount", { count: space.members.length })}
              </Badge>
              {isOwner && (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setEditingName(true)}
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
                        <AlertDialogTitle>{t("deleteSpaceTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("deleteSpaceDescription")}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("deleteSpaceCancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={handleDelete}
                        >
                          {t("deleteSpaceConfirm")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  open && "rotate-180"
                )}
              />
            </>
          )}
        </div>
      </CardHeader>

      {open && (
        <CardContent className="space-y-4 pt-0">
          {/* Members */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">
              {t("membersTitle")}
            </h4>
            <div className="space-y-2">
              {space.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2"
                >
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="size-7 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex size-7 items-center justify-center rounded-full bg-primary/10">
                      <UserIcon className="size-3.5 text-primary" />
                    </div>
                  )}
                  <span className="flex-1 truncate text-sm font-medium">
                    {member.name}
                  </span>
                  <Badge variant={member.role === "OWNER" ? "default" : "secondary"} className="text-xs">
                    {member.role === "OWNER" ? t("owner") : t("member")}
                  </Badge>
                  {isOwner && member.userId !== currentUserId && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="size-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("removeMemberTitle")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("removeMemberDescription")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("removeMemberCancel")}</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onClick={() => handleRemoveMember(member.userId)}
                          >
                            {t("removeMemberConfirm")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ))}
              {pendingInvites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 rounded-lg border border-dashed border-border/60 px-3 py-2 opacity-70"
                >
                  {inv.inviteeAvatarUrl ? (
                    <img
                      src={inv.inviteeAvatarUrl}
                      alt={inv.inviteeName ?? inv.email}
                      className="size-7 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex size-7 items-center justify-center rounded-full bg-muted">
                      <Mail className="size-3.5 text-muted-foreground" />
                    </div>
                  )}
                  <span className="flex-1 truncate text-sm">
                    {inv.inviteeName ?? inv.email}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {t("pendingInvite")}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleCancelInvitation(inv.id)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Invite form (owner only) */}
          {isOwner && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                {t("inviteTitle")}
              </h4>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleInvite()
                }}
                className="flex gap-2"
              >
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!inviteEmail.trim() || inviting}
                >
                  {inviting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Mail className="size-3.5" />
                  )}
                  {inviting ? t("inviting") : t("inviteButton")}
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
