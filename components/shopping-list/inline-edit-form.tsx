"use client"

import { useState } from "react"
import { Check, GripVertical, X } from "lucide-react"
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
  unitOptions,
  categoryOptions,
  categoryPlaceholder,
  notePlaceholder,
}: {
  item: ChecklistItem
  sortable: boolean
  onSave: (data: ItemData) => void
  onCancel: () => void
  unitOptions?: UnitOption[]
  categoryOptions?: CategoryOption[]
  categoryPlaceholder?: string
  notePlaceholder?: string
}) {
  const [editName, setEditName] = useState(item.name)
  const [editQuantity, setEditQuantity] = useState(String(item.rawQuantity ?? 0))
  const [editUnit, setEditUnit] = useState(item.rawUnit ?? "pcs")
  const [editCategoryId, setEditCategoryId] = useState(item.rawCategoryId ?? NONE_CATEGORY)
  const [editNote, setEditNote] = useState(item.note ?? "")

  function handleSave() {
    const trimmed = editName.trim()
    if (!trimmed) return
    onSave({
      name: trimmed,
      quantity: Number(editQuantity) || 0,
      unit: editUnit || "pcs",
      categoryId: editCategoryId === NONE_CATEGORY ? undefined : editCategoryId,
      note: editNote.trim() || undefined,
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
    <div className="space-y-2">
      <div className="flex gap-2">
        {sortable && (
          <span className="shrink-0 self-center text-muted-foreground/20">
            <GripVertical className="size-4" />
          </span>
        )}
        <Input
          autoFocus
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 h-7 text-sm"
        />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleSave}
            disabled={!editName.trim()}
            className="text-primary hover:text-primary"
          >
            <Check className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onCancel}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
      <div className="flex gap-2">
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
            <SelectTrigger className="flex-1 h-7 text-sm">
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
      </div>
      <Input
        value={editNote}
        onChange={(e) => setEditNote(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={notePlaceholder}
        className="h-7 text-sm"
      />
    </div>
  )
}
