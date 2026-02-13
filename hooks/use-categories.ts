import { useState, useEffect, useMemo } from "react"
import type { Category } from "@/lib/types"
import { getCategories } from "@/lib/api"

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {})
  }, [])

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>()
    for (const c of categories) map.set(c.id, c)
    return map
  }, [categories])

  return { categories, categoryMap }
}
