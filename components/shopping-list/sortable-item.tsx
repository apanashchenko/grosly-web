"use client"

import {
  defaultAnimateLayoutChanges,
  useSortable,
  type AnimateLayoutChanges,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Check, GripVertical, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { InlineEditForm } from "./inline-edit-form"
import type { ChecklistItem, ItemData, UnitOption, CategoryOption } from "./types"

export const animateLayoutChanges: AnimateLayoutChanges = (args) => {
  const { isSorting, wasDragging } = args
  if (isSorting || wasDragging) return false
  return defaultAnimateLayoutChanges(args)
}

export function SortableItem({
  item,
  index,
  onToggle,
  sortable,
  editing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDeleteItem,
  unitOptions,
  categoryOptions,
  categoryPlaceholder,
}: {
  item: ChecklistItem
  index: number
  onToggle: () => void
  sortable: boolean
  editing: boolean
  onStartEdit?: () => void
  onSaveEdit?: (data: ItemData) => void
  onCancelEdit?: () => void
  onDeleteItem?: () => void
  unitOptions?: UnitOption[]
  categoryOptions?: CategoryOption[]
  categoryPlaceholder?: string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: index, disabled: !sortable || editing, animateLayoutChanges })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? "none" : transition,
  }

  if (editing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-full py-2 rounded-lg px-1 -mx-1 bg-muted/20"
        {...attributes}
      >
        <InlineEditForm
          item={item}
          sortable={sortable}
          onSave={(data) => onSaveEdit?.(data)}
          onCancel={() => onCancelEdit?.()}
          onDelete={onDeleteItem}
          unitOptions={unitOptions}
          categoryOptions={categoryOptions}
          categoryPlaceholder={categoryPlaceholder}
        />
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex w-full items-center gap-2 py-3 rounded-lg px-1 -mx-1",
        isDragging ? "z-10 bg-muted/50 shadow-sm opacity-90" : "hover:bg-muted/30 transition-colors duration-150"
      )}
      {...attributes}
    >
      {sortable && (
        <button
          type="button"
          className="shrink-0 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      )}
      <button
        type="button"
        onClick={onToggle}
        className="shrink-0"
      >
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded border transition-all duration-200",
            item.checked
              ? "border-primary bg-primary text-primary-foreground scale-105"
              : "border-input hover:border-primary/40"
          )}
        >
          {item.checked && <Check className="size-3" />}
        </span>
      </button>
      <button
        type="button"
        onClick={onStartEdit ? onStartEdit : onToggle}
        className="flex flex-1 items-center gap-3 text-left min-w-0"
      >
        <span
          className={cn(
            "flex flex-wrap items-baseline gap-2 transition-opacity",
            item.checked && "opacity-40 line-through"
          )}
        >
          <span className="font-medium">{item.name}</span>
          {item.badge && <Badge variant="secondary">{item.badge}</Badge>}
          {item.noteBadge && (
            <Badge variant="outline">{item.noteBadge}</Badge>
          )}
        </span>
        {item.createdByName && (
          <span className="text-[11px] text-muted-foreground/60">{item.createdByName}</span>
        )}
      </button>
      {onDeleteItem && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onDeleteItem}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </Button>
      )}
    </div>
  )
}

export function PlainItem({
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
}: {
  item: ChecklistItem
  onToggle: () => void
  editing: boolean
  onStartEdit?: () => void
  onSaveEdit?: (data: ItemData) => void
  onCancelEdit?: () => void
  onDeleteItem?: () => void
  unitOptions?: UnitOption[]
  categoryOptions?: CategoryOption[]
  categoryPlaceholder?: string
}) {
  if (editing) {
    return (
      <div className="w-full py-2 rounded-lg px-1 -mx-1 bg-muted/20">
        <InlineEditForm
          item={item}
          sortable={false}
          onSave={(data) => onSaveEdit?.(data)}
          onCancel={() => onCancelEdit?.()}
          onDelete={onDeleteItem}
          unitOptions={unitOptions}
          categoryOptions={categoryOptions}
          categoryPlaceholder={categoryPlaceholder}
        />
      </div>
    )
  }

  return (
    <div
      className="group flex w-full items-center gap-2 py-3 rounded-lg px-1 -mx-1 hover:bg-muted/30 transition-colors duration-150"
    >
      <button type="button" onClick={onToggle} className="shrink-0">
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded border transition-all duration-200",
            item.checked
              ? "border-primary bg-primary text-primary-foreground scale-105"
              : "border-input hover:border-primary/40"
          )}
        >
          {item.checked && <Check className="size-3" />}
        </span>
      </button>
      <button
        type="button"
        onClick={onStartEdit ? onStartEdit : onToggle}
        className="flex flex-1 items-center gap-3 text-left min-w-0"
      >
        <span
          className={cn(
            "flex flex-wrap items-baseline gap-2 transition-opacity",
            item.checked && "opacity-40 line-through"
          )}
        >
          <span className="font-medium">{item.name}</span>
          {item.badge && <Badge variant="secondary">{item.badge}</Badge>}
        </span>
        {item.createdByName && (
          <span className="text-[11px] text-muted-foreground/60">{item.createdByName}</span>
        )}
      </button>
      {onDeleteItem && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onDeleteItem}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </Button>
      )}
    </div>
  )
}
