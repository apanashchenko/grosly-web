"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2, User as UserIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { InvitationResponse } from "@/lib/types"

interface InvitationCardProps {
  invitation: InvitationResponse
  onRespond: (id: string, accept: boolean) => Promise<void>
}

export function InvitationCard({ invitation, onRespond }: InvitationCardProps) {
  const t = useTranslations("Spaces")
  const [accepting, setAccepting] = useState(false)
  const [declining, setDeclining] = useState(false)

  async function handleRespond(accept: boolean) {
    if (accept) {
      setAccepting(true)
    } else {
      setDeclining(true)
    }
    try {
      await onRespond(invitation.id, accept)
    } finally {
      setAccepting(false)
      setDeclining(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {invitation.inviterAvatarUrl ? (
            <img
              src={invitation.inviterAvatarUrl}
              alt={invitation.inviterName}
              className="size-8 rounded-full shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <UserIcon className="size-4 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <CardTitle className="text-base">{invitation.spaceName}</CardTitle>
            <CardDescription>
              {t("invitedBy", { name: invitation.inviterName })}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => handleRespond(true)}
            disabled={accepting || declining}
          >
            {accepting && <Loader2 className="size-3.5 animate-spin" />}
            {accepting ? t("accepting") : t("acceptButton")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRespond(false)}
            disabled={accepting || declining}
          >
            {declining && <Loader2 className="size-3.5 animate-spin" />}
            {declining ? t("declining") : t("declineButton")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
