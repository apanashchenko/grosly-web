import { setRequestLocale } from "next-intl/server"
import { SavedRecipeDetail } from "@/components/recipes/saved-recipe-detail"

export default async function SavedRecipeDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)

  return <SavedRecipeDetail recipeId={id} />
}
