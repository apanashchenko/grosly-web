import { setRequestLocale } from "next-intl/server"
import { RecipeParser } from "@/components/recipes/recipe-parser"

export default async function ParsePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return <RecipeParser />
}
