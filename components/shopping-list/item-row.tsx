"use client"

import { Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { InlineEditForm } from "./inline-edit-form"
import type { ChecklistItem, ItemData, UnitOption, CategoryOption } from "./types"

interface ItemRowProps {
  item: ChecklistItem
  onToggle?: () => void
  editing: boolean
  onStartEdit?: () => void
  onSaveEdit?: (data: ItemData) => void
  onCancelEdit?: () => void
  onDeleteItem?: () => void
  unitOptions?: UnitOption[]
  categoryOptions?: CategoryOption[]
  categoryPlaceholder?: string
  notePlaceholder?: string
  sortable?: boolean
  sortHandle?: React.ReactNode
  isDragging?: boolean
}

export function ItemRow({
  item,
  onToggle,
  editing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDeleteItem,
  unitOptions,
  categoryOptions,
  categoryPlaceholder,
  notePlaceholder,
  sortable,
  sortHandle,
  isDragging,
}: ItemRowProps) {
  if (editing) {
    return (
      <div className="w-full py-2 rounded-lg px-3 border bg-muted/20">
        <InlineEditForm
          item={item}
          sortable={!!sortable}
          onSave={(data) => onSaveEdit?.(data)}
          onCancel={() => onCancelEdit?.()}
          unitOptions={unitOptions}
          categoryOptions={categoryOptions}
          categoryPlaceholder={categoryPlaceholder}
          notePlaceholder={notePlaceholder}
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "group rounded-lg px-3 border transition-colors duration-150",
        isDragging ? "z-10 bg-muted/50 shadow-sm opacity-90" : "hover:bg-muted/30",
        item.checked && "bg-muted/40 border-muted"
      )}
    >
      <div className={cn(
        "relative flex w-full items-center gap-2 py-3",
        item.checked && "hand-strikethrough"
      )}>
        {sortHandle}
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            className="flex flex-1 flex-col gap-0.5 text-left min-w-0"
          >
            <span
              className={cn(
                "font-medium truncate transition-opacity",
                item.checked && "opacity-40"
              )}
            >
              {item.name}
            </span>
          </button>
        ) : (
          <span className="flex flex-1 flex-col gap-0.5 text-left min-w-0">
            <span className="font-medium truncate">{item.name}</span>
          </span>
        )}
        <div className="ml-auto shrink-0 flex flex-col items-end gap-0.5 self-stretch justify-between">
          <div className="flex flex-col items-end gap-0.5">
            {item.createdByName && (
              <span className="text-[11px] leading-none text-muted-foreground/60">{item.createdByName}</span>
            )}
            {item.noteBadge ? (
              <Badge variant="outline" className={cn(
                "transition-opacity text-[11px]",
                item.checked && "opacity-40"
              )}>{item.noteBadge}</Badge>
            ) : !item.createdByName && <span />}
          </div>
          <div className="flex items-center gap-1">
            {item.badge && (
              <Badge variant="secondary" className={cn(
                "transition-opacity",
                item.checked && "opacity-40"
              )}>{item.badge}</Badge>
            )}
            {onStartEdit && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onStartEdit}
                disabled={item.checked}
                className="text-muted-foreground/40 hover:text-muted-foreground"
              >
                <Pencil className="size-3.5" />
              </Button>
            )}
            {onDeleteItem && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onDeleteItem}
                disabled={item.checked}
                className="text-destructive/60 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
      {item.note && (
        <p className={cn(
          "pb-2 px-1 text-xs text-muted-foreground leading-snug",
          item.checked && "opacity-40"
        )}>
          {item.note}
        </p>
      )}
    </div>
  )
}
