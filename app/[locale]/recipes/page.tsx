import { setRequestLocale } from "next-intl/server"
import { SavedRecipesList } from "@/components/recipes/saved-recipes-list"

export default async function SavedRecipesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return <SavedRecipesList />
}
