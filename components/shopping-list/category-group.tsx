"use client"

import { useState } from "react"
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSensors } from "@dnd-kit/core"
import { SortableItem } from "./sortable-item"
import type { ChecklistItem, ItemData, UnitOption, CategoryOption } from "./types"

interface ItemGroup {
  categoryId: string | null
  label: string
  icon: string | null
  items: Array<{ item: ChecklistItem; originalIndex: number }>
}

const UNCATEGORIZED = "__uncategorized__"

interface GroupedItemsProps {
  items: ChecklistItem[]
  editingIndex: number | null
  setEditingIndex: (index: number | null) => void
  onToggleItem: (index: number) => void
  onReorderItems?: (fromIndex: number, toIndex: number) => void
  onEditItem?: (index: number, data: ItemData) => void
  onDeleteItem?: (index: number) => void
  deletingItemIndex?: number | null
  unitOptions?: UnitOption[]
  categoryOptions?: CategoryOption[]
  categoryPlaceholder?: string
  notePlaceholder?: string
  uncategorizedLabel: string
  sensors: ReturnType<typeof useSensors>
}

export function GroupedItems({
  items,
  editingIndex,
  setEditingIndex,
  onToggleItem,
  onReorderItems,
  onEditItem,
  onDeleteItem,
  deletingItemIndex,
  unitOptions,
  categoryOptions,
  categoryPlaceholder,
  notePlaceholder,
  uncategorizedLabel,
  sensors,
}: GroupedItemsProps) {
  const categoryMap = new Map<string, CategoryOption>()
  for (const cat of categoryOptions ?? []) {
    categoryMap.set(cat.value, cat)
  }

  const groupMap = new Map<string, ItemGroup>()

  items.forEach((item, index) => {
    const catId = item.rawCategoryId ?? UNCATEGORIZED
    if (!groupMap.has(catId)) {
      const cat = catId !== UNCATEGORIZED ? categoryMap.get(catId) : null
      groupMap.set(catId, {
        categoryId: catId === UNCATEGORIZED ? null : catId,
        label: cat?.label ?? uncategorizedLabel,
        icon: cat?.icon ?? null,
        items: [],
      })
    }
    groupMap.get(catId)!.items.push({ item, originalIndex: index })
  })

  // Sort: fully checked groups to bottom, uncategorized to end within each tier
  const groups = [...groupMap.values()].sort((a, b) => {
    const aAllChecked = a.items.length > 0 && a.items.every(({ item }) => item.checked)
    const bAllChecked = b.items.length > 0 && b.items.every(({ item }) => item.checked)
    if (aAllChecked !== bAllChecked) return Number(aAllChecked) - Number(bAllChecked)
    if (a.categoryId === null) return 1
    if (b.categoryId === null) return -1
    return 0
  })

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <CategoryGroup
          key={group.categoryId ?? UNCATEGORIZED}
          group={group}
          editingIndex={editingIndex}
          setEditingIndex={setEditingIndex}
          onToggleItem={onToggleItem}
          onReorderItems={onReorderItems}
          onEditItem={onEditItem}
          onDeleteItem={onDeleteItem}
          deletingItemIndex={deletingItemIndex}
          unitOptions={unitOptions}
          categoryOptions={categoryOptions}
          categoryPlaceholder={categoryPlaceholder}
          notePlaceholder={notePlaceholder}
          sensors={sensors}
        />
      ))}
    </div>
  )
}

function CategoryGroup({
  group,
  editingIndex,
  setEditingIndex,
  onToggleItem,
  onReorderItems,
  onEditItem,
  onDeleteItem,
  deletingItemIndex,
  unitOptions,
  categoryOptions,
  categoryPlaceholder,
  notePlaceholder,
  sensors,
}: {
  group: ItemGroup
  editingIndex: number | null
  setEditingIndex: (index: number | null) => void
  onToggleItem: (index: number) => void
  onReorderItems?: (fromIndex: number, toIndex: number) => void
  onEditItem?: (index: number, data: ItemData) => void
  onDeleteItem?: (index: number) => void
  deletingItemIndex?: number | null
  unitOptions?: UnitOption[]
  categoryOptions?: CategoryOption[]
  categoryPlaceholder?: string
  notePlaceholder?: string
  sensors: ReturnType<typeof useSensors>
}) {
  const [open, setOpen] = useState(true)
  const sortable = !!onReorderItems

  // Sort checked items to the bottom within each group
  const sortedGroupItems = [...group.items].sort(
    (a, b) => Number(a.item.checked) - Number(b.item.checked)
  )

  const itemIds = sortedGroupItems.map(({ originalIndex }) => originalIndex)
  const allChecked = sortedGroupItems.length > 0 && sortedGroupItems.every(({ item }) => item.checked)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      onReorderItems?.(active.id as number, over.id as number)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 mb-1 px-1 group/cat transition-opacity",
          allChecked && "opacity-50"
        )}
      >
        {group.icon && <span className="text-sm">{group.icon}</span>}
        <span className={cn(
          "relative text-xs font-medium uppercase tracking-wide text-muted-foreground",
          allChecked && "hand-strikethrough"
        )}>
          {group.label}
        </span>
        <span className="text-xs text-muted-foreground/60">
          {group.items.length}
        </span>
        <div className="flex-1 border-t border-border/40" />
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground/50 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={itemIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {sortedGroupItems.map(({ item, originalIndex }) => (
                <SortableItem
                  key={item.id ?? originalIndex}
                  item={{ ...item, noteBadge: null }}
                  index={originalIndex}
                  onToggle={() => onToggleItem(originalIndex)}
                  sortable={sortable}
                  editing={editingIndex === originalIndex}
                  onStartEdit={onEditItem ? () => setEditingIndex(originalIndex) : undefined}
                  onSaveEdit={onEditItem ? (data) => {
                    onEditItem(originalIndex, data)
                    setEditingIndex(null)
                  } : undefined}
                  onCancelEdit={() => setEditingIndex(null)}
                  onDeleteItem={onDeleteItem ? () => {
                    onDeleteItem(originalIndex)
                    setEditingIndex(null)
                  } : undefined}
                  deleting={deletingItemIndex === originalIndex}
                  unitOptions={unitOptions}
                  categoryOptions={categoryOptions}
                  categoryPlaceholder={categoryPlaceholder}
                  notePlaceholder={notePlaceholder}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
