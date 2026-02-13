"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { LoaderCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface SaveRecipeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (opts: { title: string }) => void
  saving: boolean
  defaultTitle?: string
}

export function SaveRecipeDialog({
  open,
  onOpenChange,
  onSave,
  saving,
  defaultTitle = "",
}: SaveRecipeDialogProps) {
  const t = useTranslations("SaveRecipeDialog")
  const [title, setTitle] = useState(defaultTitle)

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle)
    }
  }, [open, defaultTitle])

  function handleSave() {
    onSave({ title: title.trim() })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("titlePlaceholder")}
          maxLength={100}
        />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("cancelButton")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <LoaderCircle className="animate-spin" />}
            {saving ? t("saving") : t("saveButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
