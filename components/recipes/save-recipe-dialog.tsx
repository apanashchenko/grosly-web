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
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface SaveRecipeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (opts: {
    title: string
    isAddToShoppingList: boolean
    shoppingListName: string
  }) => void
  saving: boolean
  defaultTitle?: string
  hasItems?: boolean
}

export function SaveRecipeDialog({
  open,
  onOpenChange,
  onSave,
  saving,
  defaultTitle = "",
  hasItems = false,
}: SaveRecipeDialogProps) {
  const t = useTranslations("SaveRecipeDialog")
  const [title, setTitle] = useState(defaultTitle)
  const [addToList, setAddToList] = useState(false)
  const [listName, setListName] = useState("")

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle)
      setAddToList(false)
      setListName("")
    }
  }, [open, defaultTitle])

  function handleSave() {
    onSave({
      title: title.trim(),
      isAddToShoppingList: addToList,
      shoppingListName: listName.trim(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("titlePlaceholder")}
            maxLength={100}
          />

          {hasItems && (
            <>
              <div className="flex items-center gap-2">
                <Switch
                  id="add-to-list"
                  checked={addToList}
                  onCheckedChange={setAddToList}
                />
                <Label htmlFor="add-to-list" className="cursor-pointer text-sm">
                  {t("alsoCreateShoppingList")}
                </Label>
              </div>

              {addToList && (
                <Input
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  placeholder={t("shoppingListNamePlaceholder")}
                  maxLength={100}
                />
              )}
            </>
          )}
        </div>

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
