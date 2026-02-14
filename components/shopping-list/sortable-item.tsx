"use client"

import {
  defaultAnimateLayoutChanges,
  useSortable,
  type AnimateLayoutChanges,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Check, GripVertical, Pencil, Trash2 } from "lucide-react"
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
  notePlaceholder,
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
  notePlaceholder?: string
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
          notePlaceholder={notePlaceholder}
        />
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-lg px-1 -mx-1",
        isDragging ? "z-10 bg-muted/50 shadow-sm opacity-90" : "hover:bg-muted/30 transition-colors duration-150"
      )}
      {...attributes}
    >
      {item.note && (
        <p className={cn(
          "pt-2 text-xs text-muted-foreground leading-snug",
          item.checked && "opacity-40"
        )}>
          {item.note}
        </p>
      )}
      <div className="flex w-full items-center gap-2 py-3">
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
          onClick={onToggle}
          className="flex flex-1 flex-col gap-0.5 text-left min-w-0"
        >
          <span
            className={cn(
              "font-medium truncate transition-opacity",
              item.checked && "opacity-40 line-through"
            )}
          >
            {item.name}
          </span>
        </button>
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
                className="text-muted-foreground/40 hover:text-muted-foreground"
              >
                <Pencil className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
        {onDeleteItem && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onDeleteItem}
            className="shrink-0 hidden sm:inline-flex opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
