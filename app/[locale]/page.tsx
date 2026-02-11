import { setRequestLocale } from "next-intl/server"
import { RecipeParser } from "@/components/recipes/recipe-parser"

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return <RecipeParser />
}
