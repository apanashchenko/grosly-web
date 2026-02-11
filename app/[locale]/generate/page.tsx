import { setRequestLocale } from "next-intl/server"
import { RecipeGenerator } from "@/components/recipes/recipe-generator"

export default async function GeneratePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return <RecipeGenerator />
}
