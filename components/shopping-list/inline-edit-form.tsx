"use client"

import { useRef, useState } from "react"
import { Check, GripVertical, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { NONE_CATEGORY } from "@/lib/constants"
import type { ChecklistItem, ItemData, UnitOption, CategoryOption } from "./types"

export function InlineEditForm({
  item,
  sortable,
  onSave,
  onCancel,
  onDelete,
  unitOptions,
  categoryOptions,
  categoryPlaceholder,
}: {
  item: ChecklistItem
  sortable: boolean
  onSave: (data: ItemData) => void
  onCancel: () => void
  onDelete?: () => void
  unitOptions?: UnitOption[]
  categoryOptions?: CategoryOption[]
  categoryPlaceholder?: string
}) {
  const [editName, setEditName] = useState(item.name)
  const [editQuantity, setEditQuantity] = useState(String(item.rawQuantity ?? 0))
  const [editUnit, setEditUnit] = useState(item.rawUnit ?? "pcs")
  const [editCategoryId, setEditCategoryId] = useState(item.rawCategoryId ?? NONE_CATEGORY)
  const nameInputRef = useRef<HTMLInputElement>(null)

  function handleSave() {
    const trimmed = editName.trim()
    if (!trimmed) return
    onSave({
      name: trimmed,
      quantity: Number(editQuantity) || 0,
      unit: editUnit || "pcs",
      categoryId: editCategoryId === NONE_CATEGORY ? undefined : editCategoryId,
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-1.5">
      {sortable && (
        <span className="shrink-0 text-muted-foreground/20">
          <GripVertical className="size-4" />
        </span>
      )}
      <Input
        ref={nameInputRef}
        autoFocus
        value={editName}
        onChange={(e) => setEditName(e.target.value)}
        onKeyDown={handleKeyDown}
        className="min-w-0 flex-[1_1_8rem] h-7 text-sm"
      />
      <Input
        type="number"
        value={editQuantity}
        onChange={(e) => setEditQuantity(e.target.value)}
        onKeyDown={handleKeyDown}
        min={0}
        step="any"
        className="w-16 h-7 text-sm"
      />
      {unitOptions && (
        <Select value={editUnit} onValueChange={setEditUnit}>
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
      )}
      {categoryOptions && (
        <Select value={editCategoryId} onValueChange={setEditCategoryId}>
          <SelectTrigger className="w-28 h-7 text-sm">
            <SelectValue placeholder={categoryPlaceholder} />
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
      )}
      <div className="flex items-center gap-1.5 ml-auto">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleSave}
          disabled={!editName.trim()}
          className="text-primary hover:text-primary"
        >
          <Check className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onCancel}
        >
          <X className="size-4" />
        </Button>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
