import { useMessages } from "next-intl"

interface CategoryLike {
  name: string
  slug?: string
}

export function useCategoryLocalization() {
  const messages = useMessages()
  const catMessages = (messages.Categories ?? {}) as Record<string, unknown>
  const categoryNameMap = (catMessages?.categoryNames ?? {}) as Record<string, string>

  function localizeCategoryName(cat: CategoryLike) {
    return (cat.slug ? categoryNameMap[cat.slug] : undefined) ?? cat.name
  }

  return { localizeCategoryName, categoryNameMap }
}
