import { useMessages } from "next-intl"
import type { Category } from "@/lib/types"

export function useCategoryLocalization() {
  const messages = useMessages()
  const catMessages = (messages.Categories ?? {}) as Record<string, unknown>
  const categoryNameMap = (catMessages?.categoryNames ?? {}) as Record<string, string>

  function localizeCategoryName(cat: Category) {
    return categoryNameMap[cat.slug] ?? cat.name
  }

  return { localizeCategoryName, categoryNameMap }
}
