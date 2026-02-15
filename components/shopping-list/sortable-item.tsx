"use client"

import {
  defaultAnimateLayoutChanges,
  useSortable,
  type AnimateLayoutChanges,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { ItemRow } from "./item-row"
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
  deleting,
  unitOptions,
  categoryOptions,
  categoryPlaceholder,
  notePlaceholder,
}: {
  item: ChecklistItem
  index: number
  onToggle?: () => void
  sortable: boolean
  editing: boolean
  onStartEdit?: () => void
  onSaveEdit?: (data: ItemData) => void
  onCancelEdit?: () => void
  onDeleteItem?: () => void
  deleting?: boolean
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

  const sortHandle = sortable ? (
    <button
      type="button"
      className="shrink-0 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
      {...listeners}
    >
      <GripVertical className="size-4" />
    </button>
  ) : undefined

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <ItemRow
        item={item}
        onToggle={onToggle}
        editing={editing}
        onStartEdit={onStartEdit}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onDeleteItem={onDeleteItem}
        deleting={deleting}
        unitOptions={unitOptions}
        categoryOptions={categoryOptions}
        categoryPlaceholder={categoryPlaceholder}
        notePlaceholder={notePlaceholder}
        sortable={sortable}
        sortHandle={sortHandle}
        isDragging={isDragging}
      />
    </div>
  )
}
