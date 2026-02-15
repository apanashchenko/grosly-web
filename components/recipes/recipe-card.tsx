"use client"

import { useState } from "react"
import { Check, ChevronDown, Clock, Pencil, Plus, Trash2, Users, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RecipeIngredient, RecipeInstruction, IngredientUnit, Category } from "@/lib/types"
import { useCategoryLocalization } from "@/hooks/use-category-localization"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface UnitOption {
  value: string
  label: string
}

interface CategoryOption {
  value: string
  label: string
  icon?: string | null
}

interface Props {
  dishName: string
  description: string
  cookingTimeLabel?: string
  peopleLabel?: string
  ingredients: RecipeIngredient[]
  instructions?: RecipeInstruction[]
  instructionsLabel?: string
  footer?: React.ReactNode
  defaultOpen?: boolean
  highlightIngredients?: string[]
  categoryMap?: Map<string, Category>
  // Raw values for editing
  cookingTime?: number
  people?: number
  // Editing callbacks — presence enables editing for that field
  onEditCookingTime?: (time: number) => void
  onEditPeople?: (people: number) => void
  onEditDishName?: (name: string) => void
  onEditDescription?: (desc: string) => void
  onEditIngredient?: (index: number, data: RecipeIngredient) => void
  onDeleteIngredient?: (index: number) => void
  onAddIngredient?: (data: RecipeIngredient) => void
  onEditInstruction?: (index: number, text: string) => void
  onDeleteInstruction?: (index: number) => void
  onAddInstruction?: (text: string) => void
  unitOptions?: UnitOption[]
  categoryOptions?: CategoryOption[]
  ingredientNamePlaceholder?: string
  qtyPlaceholder?: string
  unitPlaceholder?: string
  categoryPlaceholder?: string
  addIngredientLabel?: string
  addStepLabel?: string
  stepPlaceholder?: string
  noCategoryLabel?: string
}

export function RecipeCard({
  dishName,
  description,
  cookingTimeLabel,
  peopleLabel,
  cookingTime,
  people,
  ingredients,
  instructions,
  instructionsLabel,
  footer,
  defaultOpen = true,
  highlightIngredients,
  categoryMap,
  onEditCookingTime,
  onEditPeople,
  onEditDishName,
  onEditDescription,
  onEditIngredient,
  onDeleteIngredient,
  onAddIngredient,
  onEditInstruction,
  onDeleteInstruction,
  onAddInstruction,
  unitOptions,
  categoryOptions,
  ingredientNamePlaceholder,
  qtyPlaceholder,
  unitPlaceholder,
  categoryPlaceholder,
  addIngredientLabel,
  addStepLabel,
  stepPlaceholder,
  noCategoryLabel = "—",
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const { localizeCategoryName } = useCategoryLocalization()

  // Editing state
  const [editingCookingTime, setEditingCookingTime] = useState(false)
  const [cookingTimeDraft, setCookingTimeDraft] = useState(0)
  const [editingPeople, setEditingPeople] = useState(false)
  const [peopleDraft, setPeopleDraft] = useState(0)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState("")
  const [editingDesc, setEditingDesc] = useState(false)
  const [descDraft, setDescDraft] = useState("")
  const [editingIngIdx, setEditingIngIdx] = useState<number | null>(null)
  const [ingDraft, setIngDraft] = useState({ name: "", quantity: 0, unit: "", categoryId: "" })
  const [editingStepIdx, setEditingStepIdx] = useState<number | null>(null)
  const [stepDraft, setStepDraft] = useState("")
  const [addingIngredient, setAddingIngredient] = useState(false)
  const [newIngDraft, setNewIngDraft] = useState({ name: "", quantity: 0, unit: "", categoryId: "" })
  const [addingStep, setAddingStep] = useState(false)
  const [newStepDraft, setNewStepDraft] = useState("")

  const highlightSet = highlightIngredients
    ? new Set(highlightIngredients.map((i) => i.toLowerCase()))
    : null

  function startEditName() {
    setNameDraft(dishName)
    setEditingName(true)
  }

  function saveName() {
    const trimmed = nameDraft.trim()
    if (trimmed && trimmed !== dishName) {
      onEditDishName?.(trimmed)
    }
    setEditingName(false)
  }

  function startEditDesc() {
    setDescDraft(description)
    setEditingDesc(true)
  }

  function saveDesc() {
    const trimmed = descDraft.trim()
    if (trimmed !== description) {
      onEditDescription?.(trimmed)
    }
    setEditingDesc(false)
  }

  function startEditIngredient(index: number) {
    const ing = ingredients[index]
    if (!ing) return
    setIngDraft({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit?.canonical ?? "",
      categoryId: ing.categoryId ?? "",
    })
    setEditingIngIdx(index)
  }

  function saveIngredient() {
    if (editingIngIdx === null) return
    const trimmedName = ingDraft.name.trim()
    if (!trimmedName) return
    const original = ingredients[editingIngIdx]
    onEditIngredient?.(editingIngIdx, {
      name: trimmedName,
      quantity: ingDraft.quantity,
      unit: {
        canonical: ingDraft.unit,
        localized: unitOptions?.find((u) => u.value === ingDraft.unit)?.label ?? ingDraft.unit,
      },
      categoryId: ingDraft.categoryId || original.categoryId,
    })
    setEditingIngIdx(null)
  }

  function saveNewIngredient() {
    const trimmedName = newIngDraft.name.trim()
    if (!trimmedName) return
    onAddIngredient?.({
      name: trimmedName,
      quantity: newIngDraft.quantity,
      unit: {
        canonical: newIngDraft.unit,
        localized: unitOptions?.find((u) => u.value === newIngDraft.unit)?.label ?? newIngDraft.unit,
      },
      categoryId: newIngDraft.categoryId || null,
    })
    setNewIngDraft({ name: "", quantity: 0, unit: "", categoryId: "" })
    setAddingIngredient(false)
  }

  function startEditStep(index: number) {
    const step = instructions?.[index]
    if (!step) return
    setStepDraft(step.text)
    setEditingStepIdx(index)
  }

  function saveStep() {
    if (editingStepIdx === null) return
    const trimmed = stepDraft.trim()
    if (trimmed) {
      onEditInstruction?.(editingStepIdx, trimmed)
    }
    setEditingStepIdx(null)
  }

  function saveNewStep() {
    const trimmed = newStepDraft.trim()
    if (!trimmed) return
    onAddInstruction?.(trimmed)
    setNewStepDraft("")
    setAddingStep(false)
  }

  return (
    <Card>
      <CardHeader>
        {editingName ? (
          <div className="flex items-center gap-1.5">
            <Input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); saveName() }
                else if (e.key === "Escape") { e.preventDefault(); setEditingName(false) }
              }}
              className="h-8 text-base font-semibold"
            />
            <Button variant="ghost" size="icon-xs" disabled={!nameDraft.trim()} onClick={saveName} className="text-primary hover:text-primary">
              <Check className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={() => setEditingName(false)}>
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          <CardTitle>
            {onEditDishName ? (
              <button
                type="button"
                onClick={startEditName}
                className="inline hover:text-primary transition-colors text-left"
              >
                {dishName}
                {" "}
                <Pencil className="inline size-3 opacity-60 align-baseline" />
              </button>
            ) : (
              dishName
            )}
          </CardTitle>
        )}
        {editingDesc ? (
          <div className="space-y-1.5">
            <Textarea
              autoFocus
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { e.preventDefault(); setEditingDesc(false) }
              }}
              rows={2}
              className="min-h-[60px] resize-y text-sm"
            />
            <div className="flex gap-1">
              <Button variant="ghost" size="icon-xs" onClick={saveDesc} className="text-primary hover:text-primary">
                <Check className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={() => setEditingDesc(false)}>
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <CardDescription className="flex flex-wrap items-center gap-2">
            {onEditDescription ? (
              <button
                type="button"
                onClick={startEditDesc}
                className="inline hover:text-foreground transition-colors text-left"
              >
                {description}
                {" "}
                <Pencil className="inline size-3 opacity-60 align-baseline" />
              </button>
            ) : (
              description
            )}
            {editingPeople ? (
              <span className="inline-flex items-center gap-1">
                <Users className="size-3 text-primary" />
                <Input
                  autoFocus
                  type="number"
                  min={1}
                  value={peopleDraft || ""}
                  onChange={(e) => setPeopleDraft(Number(e.target.value) || 0)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); if (peopleDraft > 0) { onEditPeople?.(peopleDraft) }; setEditingPeople(false) }
                    else if (e.key === "Escape") { e.preventDefault(); setEditingPeople(false) }
                  }}
                  className="w-14 h-6 text-xs"
                />
                <Button variant="ghost" size="icon-xs" disabled={peopleDraft <= 0} onClick={() => { if (peopleDraft > 0) { onEditPeople?.(peopleDraft) }; setEditingPeople(false) }} className="text-primary hover:text-primary">
                  <Check className="size-3" />
                </Button>
                <Button variant="ghost" size="icon-xs" onClick={() => setEditingPeople(false)}>
                  <X className="size-3" />
                </Button>
              </span>
            ) : peopleLabel && (
              <Badge
                variant="outline"
                className={cn("gap-1 bg-primary/5 border-primary/20 text-primary", onEditPeople && "cursor-pointer hover:bg-primary/10")}
                {...(onEditPeople && { onClick: () => { setPeopleDraft(people ?? 0); setEditingPeople(true) } })}
              >
                <Users className="size-3" />
                {peopleLabel}
                {onEditPeople && <Pencil className="size-2.5 opacity-60" />}
              </Badge>
            )}
            {editingCookingTime ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3 text-primary" />
                <Input
                  autoFocus
                  type="number"
                  min={1}
                  value={cookingTimeDraft || ""}
                  onChange={(e) => setCookingTimeDraft(Number(e.target.value) || 0)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); if (cookingTimeDraft > 0) { onEditCookingTime?.(cookingTimeDraft) }; setEditingCookingTime(false) }
                    else if (e.key === "Escape") { e.preventDefault(); setEditingCookingTime(false) }
                  }}
                  className="w-14 h-6 text-xs"
                />
                <Button variant="ghost" size="icon-xs" disabled={cookingTimeDraft <= 0} onClick={() => { if (cookingTimeDraft > 0) { onEditCookingTime?.(cookingTimeDraft) }; setEditingCookingTime(false) }} className="text-primary hover:text-primary">
                  <Check className="size-3" />
                </Button>
                <Button variant="ghost" size="icon-xs" onClick={() => setEditingCookingTime(false)}>
                  <X className="size-3" />
                </Button>
              </span>
            ) : cookingTimeLabel && (
              <Badge
                variant="outline"
                className={cn("gap-1 bg-primary/5 border-primary/20 text-primary", onEditCookingTime && "cursor-pointer hover:bg-primary/10")}
                {...(onEditCookingTime && { onClick: () => { setCookingTimeDraft(cookingTime ?? 0); setEditingCookingTime(true) } })}
              >
                <Clock className="size-3" />
                {cookingTimeLabel}
                {onEditCookingTime && <Pencil className="size-2.5 opacity-60" />}
              </Badge>
            )}
          </CardDescription>
        )}
        <CardAction>
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
        </CardAction>
      </CardHeader>
      {open && (
        <>
          <CardContent>
            <div className="divide-y">
              {ingredients.map((ingredient, index) => {
                if (!ingredient.name) return null

                // Editing mode for this ingredient
                if (editingIngIdx === index) {
                  return (
                    <div key={index} className="space-y-1.5 py-3">
                      <Input
                        autoFocus
                        value={ingDraft.name}
                        onChange={(e) => setIngDraft((d) => ({ ...d, name: e.target.value }))}
                        placeholder={ingredientNamePlaceholder}
                        className="h-7 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); saveIngredient() }
                          else if (e.key === "Escape") { e.preventDefault(); setEditingIngIdx(null) }
                        }}
                      />
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          value={ingDraft.quantity || ""}
                          onChange={(e) => setIngDraft((d) => ({ ...d, quantity: Number(e.target.value) || 0 }))}
                          placeholder={qtyPlaceholder}
                          min={0}
                          step="any"
                          className="w-16 h-7 text-sm"
                        />
                        {unitOptions && unitOptions.length > 0 && (
                          <Select value={ingDraft.unit} onValueChange={(v) => setIngDraft((d) => ({ ...d, unit: v }))}>
                            <SelectTrigger className="w-20 h-7 text-sm">
                              <SelectValue placeholder={unitPlaceholder} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {unitOptions.map((u) => (
                                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        )}
                        {categoryOptions && categoryOptions.length > 0 && (
                          <Select value={ingDraft.categoryId || "__none__"} onValueChange={(v) => setIngDraft((d) => ({ ...d, categoryId: v === "__none__" ? "" : v }))}>
                            <SelectTrigger className="flex-1 h-7 text-sm">
                              <SelectValue placeholder={categoryPlaceholder} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectItem value="__none__">{noCategoryLabel}</SelectItem>
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
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-xs" disabled={!ingDraft.name.trim()} onClick={saveIngredient} className="text-primary hover:text-primary">
                          <Check className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => setEditingIngIdx(null)}>
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                }

                // Read mode
                const isHighlighted =
                  highlightSet?.has(ingredient.name.toLowerCase()) ?? false
                const qty = ingredient.unit
                  ? `${ingredient.quantity ?? ""} ${ingredient.unit.localized ?? ""}`
                  : ingredient.quantity != null ? `${ingredient.quantity}` : ""
                const category = ingredient.categoryId
                  ? categoryMap?.get(ingredient.categoryId)
                  : undefined
                return (
                  <div key={index} className="py-3">
                    <div className="group/ing flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span
                        className={cn(
                          "flex-1 font-medium break-words",
                          isHighlighted && "text-primary bg-primary/10 px-1 rounded"
                        )}
                      >
                        {ingredient.name}
                      </span>
                      <div className="flex items-baseline gap-2">
                        {qty && <Badge variant="secondary" className="shrink-0">{qty}</Badge>}
                        {category && (
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {category.icon ? `${category.icon} ` : ""}
                            {localizeCategoryName(category)}
                          </Badge>
                        )}
                        {onEditIngredient && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => startEditIngredient(index)}
                            className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground"
                          >
                            <Pencil className="size-3" />
                          </Button>
                        )}
                        {onDeleteIngredient && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => onDeleteIngredient(index)}
                            className="shrink-0 text-destructive/60 hover:text-destructive"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Add ingredient form */}
            {onAddIngredient && (
              addingIngredient ? (
                <div className="space-y-1.5 pt-3 border-t">
                  <Input
                    autoFocus
                    value={newIngDraft.name}
                    onChange={(e) => setNewIngDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder={ingredientNamePlaceholder}
                    className="h-7 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); saveNewIngredient() }
                      else if (e.key === "Escape") { e.preventDefault(); setAddingIngredient(false); setNewIngDraft({ name: "", quantity: 0, unit: "", categoryId: "" }) }
                    }}
                  />
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      value={newIngDraft.quantity || ""}
                      onChange={(e) => setNewIngDraft((d) => ({ ...d, quantity: Number(e.target.value) || 0 }))}
                      placeholder={qtyPlaceholder}
                      min={0}
                      step="any"
                      className="w-16 h-7 text-sm"
                    />
                    {unitOptions && unitOptions.length > 0 && (
                      <Select value={newIngDraft.unit} onValueChange={(v) => setNewIngDraft((d) => ({ ...d, unit: v }))}>
                        <SelectTrigger className="w-20 h-7 text-sm">
                          <SelectValue placeholder={unitPlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {unitOptions.map((u) => (
                              <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                    {categoryOptions && categoryOptions.length > 0 && (
                      <Select value={newIngDraft.categoryId || "__none__"} onValueChange={(v) => setNewIngDraft((d) => ({ ...d, categoryId: v === "__none__" ? "" : v }))}>
                        <SelectTrigger className="flex-1 h-7 text-sm">
                          <SelectValue placeholder={categoryPlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="__none__">{noCategoryLabel}</SelectItem>
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
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-xs" disabled={!newIngDraft.name.trim()} onClick={saveNewIngredient} className="text-primary hover:text-primary">
                      <Check className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-xs" onClick={() => { setAddingIngredient(false); setNewIngDraft({ name: "", quantity: 0, unit: "", categoryId: "" }) }}>
                      <X className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddingIngredient(true)}
                  className="mt-2 w-full text-muted-foreground hover:text-foreground"
                >
                  <Plus className="size-3.5" />
                  {addIngredientLabel}
                </Button>
              )
            )}

            {/* Instructions */}
            {((instructions && instructions.length > 0) || onAddInstruction) && (
              <div className="mt-4">
                {instructionsLabel && (
                  <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
                    {instructionsLabel}
                  </h4>
                )}
                <ol className="list-none space-y-2">
                  {instructions?.map((instruction, idx) => {
                    if (editingStepIdx === idx) {
                      return (
                        <li key={idx} className="space-y-1.5">
                          <Textarea
                            autoFocus
                            value={stepDraft}
                            onChange={(e) => setStepDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") { e.preventDefault(); setEditingStepIdx(null) }
                            }}
                            rows={2}
                            className="min-h-[50px] resize-y text-sm"
                          />
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon-xs" disabled={!stepDraft.trim()} onClick={saveStep} className="text-primary hover:text-primary">
                              <Check className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon-xs" onClick={() => setEditingStepIdx(null)}>
                              <X className="size-3.5" />
                            </Button>
                          </div>
                        </li>
                      )
                    }

                    return (
                      <li key={idx} className="group/step flex gap-3 py-1">
                        {instruction.step != null && (
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {instruction.step}
                          </span>
                        )}
                        <span className="flex-1 text-sm leading-relaxed">
                          {instruction.text ?? ""}
                        </span>
                        {onEditInstruction && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => startEditStep(idx)}
                            className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground"
                          >
                            <Pencil className="size-3" />
                          </Button>
                        )}
                        {onDeleteInstruction && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => onDeleteInstruction(idx)}
                            className="shrink-0 text-destructive/60 hover:text-destructive"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                      </li>
                    )
                  })}
                </ol>

                {/* Add step */}
                {onAddInstruction && (
                  addingStep ? (
                    <div className="mt-2 space-y-1.5">
                      <Textarea
                        autoFocus
                        value={newStepDraft}
                        onChange={(e) => setNewStepDraft(e.target.value)}
                        placeholder={stepPlaceholder}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") { e.preventDefault(); setAddingStep(false); setNewStepDraft("") }
                        }}
                        rows={2}
                        className="min-h-[50px] resize-y text-sm"
                      />
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-xs" disabled={!newStepDraft.trim()} onClick={saveNewStep} className="text-primary hover:text-primary">
                          <Check className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => { setAddingStep(false); setNewStepDraft("") }}>
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddingStep(true)}
                      className="mt-2 w-full text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="size-3.5" />
                      {addStepLabel}
                    </Button>
                  )
                )}
              </div>
            )}
          </CardContent>
          {footer && <CardFooter>{footer}</CardFooter>}
        </>
      )}
    </Card>
  )
}
