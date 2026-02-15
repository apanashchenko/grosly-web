"use client"

import { useState } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
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
import { Check, Layers, Loader2, Pencil, Pin, Sparkles, Tag, Trash2, Users, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
  onShareToSpace?: () => void
  shareToSpaceLabel?: string
  label?: string | null
  onEditLabel?: (label: string | null) => void
  labelPlaceholder?: string
  isPinned?: boolean
  onTogglePin?: () => void
  pinLabel?: string
  deleteTitle?: string
  deleteDescription?: string
  deleteConfirm?: string
  deleteCancel?: string
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
  label,
  onEditLabel,
  labelPlaceholder,
  isPinned,
  onTogglePin,
  pinLabel,
  onShareToSpace,
  shareToSpaceLabel,
  deleteTitle,
  deleteDescription,
  deleteConfirm,
  deleteCancel,
  selectable,
  selected,
  onSelect,
  onOpen,
}: Props) {
  const hasContent = items.length > 0 || !!onAddItem
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(title)
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState(label ?? "")

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
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

  // Sort checked items to the bottom, preserve relative order within each group
  const sortedItems = items
    .map((item, index) => ({ item, originalIndex: index }))
    .sort((a, b) => Number(a.item.checked) - Number(b.item.checked))

  const itemIds = sortedItems.map(({ originalIndex }) => originalIndex)

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
        <div className="flex items-center justify-between gap-2">
          {selectable && (
            <div
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/30"
              )}
            >
              {selected && <Check className="size-3" />}
            </div>
          )}
          <div className="min-w-0 flex-1">
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
          </div>
          {(hasContent || label) && (
            <div className="flex items-center gap-2 shrink-0">
              {!hasContent && label && (
                <Badge className="text-xs px-2 py-0.5 font-normal bg-accent/60 text-accent-foreground border-accent/80 hover:bg-accent/60">
                  <Tag className="size-3 mr-1" />
                  {label}
                </Badge>
              )}
              {onShareToSpace && !selectable && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onShareToSpace}
                  title={shareToSpaceLabel}
                >
                  <Users className="size-4" />
                </Button>
              )}
              {onSmartGroup && (
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
              {onToggleGrouped && (
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
            </div>
          )}
        </div>
        <CardDescription>
          <div className="flex items-center justify-between">
            <span>{description}</span>
            {hasContent && onEditLabel && editingLabel ? (
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <Input
                  autoFocus
                  value={labelDraft}
                  onChange={(e) => setLabelDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      const trimmed = labelDraft.trim()
                      onEditLabel(trimmed || null)
                      setEditingLabel(false)
                    } else if (e.key === "Escape") {
                      e.preventDefault()
                      setLabelDraft(label ?? "")
                      setEditingLabel(false)
                    }
                  }}
                  placeholder={labelPlaceholder}
                  className="h-6 w-28 text-xs"
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    const trimmed = labelDraft.trim()
                    onEditLabel(trimmed || null)
                    setEditingLabel(false)
                  }}
                  className="text-primary hover:text-primary"
                >
                  <Check className="size-3" />
                </Button>
                {label && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      onEditLabel(null)
                      setLabelDraft("")
                      setEditingLabel(false)
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    setLabelDraft(label ?? "")
                    setEditingLabel(false)
                  }}
                >
                  <X className="size-3" />
                </Button>
              </div>
            ) : hasContent && (label || onEditLabel) ? (
              <button
                type="button"
                onClick={onEditLabel ? () => {
                  setLabelDraft(label ?? "")
                  setEditingLabel(true)
                } : undefined}
                className={cn(
                  "shrink-0 ml-2 inline-flex items-center",
                  onEditLabel && "hover:opacity-70 transition-opacity cursor-pointer"
                )}
              >
                {label ? (
                  <Badge className="text-xs px-2 py-0.5 font-normal bg-accent/60 text-accent-foreground border-accent/80 hover:bg-accent/60">
                    <Tag className="size-3 mr-1" />
                    {label}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs px-2 py-0.5 font-normal text-muted-foreground border-dashed">
                    <Tag className="size-3 mr-1" />
                    {labelPlaceholder}
                  </Badge>
                )}
              </button>
            ) : null}
          </div>
          {(createdAt || (onTogglePin && !selectable)) && (
            <div className="flex items-center justify-between mt-1.5">
              {createdAt ? (
                <span className="text-xs text-muted-foreground/70">{createdAt}</span>
              ) : <span />}
              {onTogglePin && !selectable && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={onTogglePin}
                  title={pinLabel}
                  className={cn(
                    "transition-colors",
                    isPinned ? "text-primary bg-primary/10" : "text-muted-foreground/50"
                  )}
                >
                  <Pin className={cn("size-3.5 transition-all", isPinned && "fill-current")} />
                </Button>
              )}
            </div>
          )}
        </CardDescription>
      </CardHeader>
      {hasContent && (
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
                <div className="space-y-2">
                  {sortedItems.map(({ item, originalIndex }) => (
                    <SortableItem
                      key={item.id ?? originalIndex}
                      item={item}
                      index={originalIndex}
                      onToggle={() => onToggleItem(originalIndex)}
                      sortable={!!onReorderItems}
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full mt-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{deleteTitle}</AlertDialogTitle>
                  <AlertDialogDescription>{deleteDescription}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{deleteCancel}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteConfirm}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      )}
    </Card>
  )
}
