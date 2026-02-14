"use client"

import { useState } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { Check, ChevronDown, Layers, Loader2, Pencil, Sparkles, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SortableItem } from "./sortable-item"
import { AddItemForm } from "./add-item-form"
import { GroupedItems } from "./category-group"
import type { ChecklistItem, ItemData, UnitOption, CategoryOption } from "./types"

export type { ChecklistItem, CategoryOption, ItemData, UnitOption }

interface Props {
  title: string
  description: string
  items: ChecklistItem[]
  onToggleItem: (index: number) => void
  onReorderItems?: (fromIndex: number, toIndex: number) => void
  onDelete?: () => void
  defaultOpen?: boolean
  onEditItem?: (index: number, data: ItemData) => void
  onDeleteItem?: (index: number) => void
  onAddItem?: (data: ItemData) => void
  onEditTitle?: (name: string) => void
  createdAt?: string
  unitOptions?: UnitOption[]
  categoryOptions?: CategoryOption[]
  categoryPlaceholder?: string
  addItemPlaceholder?: string
  qtyPlaceholder?: string
  unitPlaceholder?: string
  notePlaceholder?: string
  grouped?: boolean
  onToggleGrouped?: () => void
  groupByLabel?: string
  uncategorizedLabel?: string
  onSmartGroup?: () => void
  smartGroupLoading?: boolean
  smartGroupLabel?: string
  selectable?: boolean
  selected?: boolean
  onSelect?: () => void
  onOpen?: () => void
}

export function ShoppingListCard({
  title,
  description,
  items,
  onToggleItem,
  onReorderItems,
  onDelete,
  defaultOpen = true,
  onEditTitle,
  createdAt,
  onEditItem,
  onDeleteItem,
  onAddItem,
  unitOptions,
  categoryOptions,
  categoryPlaceholder,
  addItemPlaceholder,
  qtyPlaceholder,
  unitPlaceholder,
  notePlaceholder,
  grouped,
  onToggleGrouped,
  groupByLabel,
  uncategorizedLabel = "Uncategorized",
  onSmartGroup,
  smartGroupLoading,
  smartGroupLabel,
  selectable,
  selected,
  onSelect,
  onOpen,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(title)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      onReorderItems?.(active.id as number, over.id as number)
    }
  }

  const itemIds = items.map((_, i) => i)

  return (
    <Card
      className={cn(
        (selectable || onOpen) && "cursor-pointer transition-colors",
        selectable && selected && "border-primary bg-primary/5"
      )}
      onClick={(e) => {
        if (selectable) { onSelect?.(); return }
        if (!onOpen) return
        const target = e.target as HTMLElement
        if (target.closest("button, input, a, [role='button']")) return
        onOpen()
      }}
    >
      <CardHeader>
        {selectable && (
          <div
            className={cn(
              "mr-2 flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/30"
            )}
          >
            {selected && <Check className="size-3" />}
          </div>
        )}
        {editingTitle ? (
          <div className="flex items-center gap-1.5">
            <Input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  const trimmed = titleDraft.trim()
                  if (trimmed && trimmed !== title) {
                    onEditTitle?.(trimmed)
                  }
                  setEditingTitle(false)
                } else if (e.key === "Escape") {
                  e.preventDefault()
                  setTitleDraft(title)
                  setEditingTitle(false)
                }
              }}
              className="h-7 text-sm font-semibold"
            />
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={!titleDraft.trim()}
              onClick={() => {
                const trimmed = titleDraft.trim()
                if (trimmed && trimmed !== title) {
                  onEditTitle?.(trimmed)
                }
                setEditingTitle(false)
              }}
              className="text-primary hover:text-primary"
            >
              <Check className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                setTitleDraft(title)
                setEditingTitle(false)
              }}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          <CardTitle>
            {onEditTitle ? (
              <button
                type="button"
                onClick={() => {
                  setTitleDraft(title)
                  setEditingTitle(true)
                }}
                className="group/title inline-flex items-center gap-1.5 hover:text-primary transition-colors text-left"
              >
                {title}
                <Pencil className="size-3 opacity-0 group-hover/title:opacity-60 transition-opacity" />
              </button>
            ) : (
              title
            )}
          </CardTitle>
        )}
        <CardDescription>
          <span>{description}</span>
          {createdAt && (
            <span className="block text-xs text-muted-foreground/70 mt-0.5">
              {createdAt}
            </span>
          )}
        </CardDescription>
        <CardAction>
          <div className="flex items-center gap-2">
            {onSmartGroup && open && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onSmartGroup}
                disabled={smartGroupLoading || items.length === 0}
                title={smartGroupLabel}
              >
                {smartGroupLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
              </Button>
            )}
            {onToggleGrouped && open && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onToggleGrouped}
                title={groupByLabel}
                className={cn(
                  grouped && "text-primary bg-primary/10"
                )}
              >
                <Layers className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen((v) => !v)}
            >
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  open && "rotate-180"
                )}
              />
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      {open && (
        <CardContent>
          {grouped ? (
            <GroupedItems
              items={items}
              editingIndex={editingIndex}
              setEditingIndex={setEditingIndex}
              onToggleItem={onToggleItem}
              onReorderItems={onReorderItems}
              onEditItem={onEditItem}
              onDeleteItem={onDeleteItem}
              unitOptions={unitOptions}
              categoryOptions={categoryOptions}
              categoryPlaceholder={categoryPlaceholder}
              notePlaceholder={notePlaceholder}
              uncategorizedLabel={uncategorizedLabel}
              sensors={sensors}
            />
          ) : (
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
                <div className="divide-y">
                  {items.map((item, index) => (
                    <SortableItem
                      key={item.id ?? index}
                      item={item}
                      index={index}
                      onToggle={() => onToggleItem(index)}
                      sortable={!!onReorderItems}
                      editing={editingIndex === index}
                      onStartEdit={onEditItem ? () => setEditingIndex(index) : undefined}
                      onSaveEdit={onEditItem ? (data) => {
                        onEditItem(index, data)
                        setEditingIndex(null)
                      } : undefined}
                      onCancelEdit={() => setEditingIndex(null)}
                      onDeleteItem={onDeleteItem ? () => {
                        onDeleteItem(index)
                        setEditingIndex(null)
                      } : undefined}
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
          {onAddItem && (
            <AddItemForm
              onAddItem={onAddItem}
              unitOptions={unitOptions}
              categoryOptions={categoryOptions}
              categoryPlaceholder={categoryPlaceholder}
              placeholder={addItemPlaceholder}
              qtyPlaceholder={qtyPlaceholder}
              unitPlaceholder={unitPlaceholder}
              notePlaceholder={notePlaceholder}
            />
          )}
          {onDelete && (
            <Button
              variant="ghost"
              onClick={onDelete}
              className="w-full mt-3 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  )
}
