import { setRequestLocale } from "next-intl/server"
import { ManualRecipeCreator } from "@/components/recipes/manual-recipe-creator"

export default async function ManualRecipePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return <ManualRecipeCreator />
}
