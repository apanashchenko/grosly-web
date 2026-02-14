"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
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
import type { ItemData, UnitOption, CategoryOption } from "./types"

export function AddItemForm({
  onAddItem,
  unitOptions,
  categoryOptions,
  categoryPlaceholder,
  placeholder,
  qtyPlaceholder,
  unitPlaceholder,
  notePlaceholder,
}: {
  onAddItem: (data: ItemData) => void
  unitOptions?: UnitOption[]
  categoryOptions?: CategoryOption[]
  categoryPlaceholder?: string
  placeholder?: string
  qtyPlaceholder?: string
  unitPlaceholder?: string
  notePlaceholder?: string
}) {
  const [name, setName] = useState("")
  const [quantity, setQuantity] = useState("")
  const [unit, setUnit] = useState("")
  const [categoryId, setCategoryId] = useState(NONE_CATEGORY)
  const [note, setNote] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onAddItem({
      name: trimmed,
      quantity: Number(quantity) || 0,
      unit: unit || "pcs",
      categoryId: categoryId === NONE_CATEGORY ? undefined : categoryId,
      note: note.trim() || undefined,
    })
    setName("")
    setQuantity("")
    setUnit("")
    setCategoryId(NONE_CATEGORY)
    setNote("")
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2 pt-3">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 basis-32 h-7 text-sm"
      />
      <Input
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        placeholder={qtyPlaceholder}
        min={0}
        step="any"
        className="w-16 h-7 text-sm"
      />
      {unitOptions && (
        <Select value={unit} onValueChange={setUnit}>
          <SelectTrigger className="w-20 h-7 text-sm">
            <SelectValue placeholder={unitPlaceholder} />
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
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="min-w-0 flex-1 basis-28 h-7 text-sm">
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
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={notePlaceholder}
        className="min-w-0 flex-1 basis-32 h-7 text-sm"
      />
      <Button
        type="submit"
        variant="ghost"
        size="icon-xs"
        disabled={!name.trim()}
        className="text-primary hover:text-primary"
      >
        <Plus className="size-4" />
      </Button>
    </form>
  )
}
