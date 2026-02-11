import { setRequestLocale } from "next-intl/server"
import { RecipeSuggester } from "@/components/recipes/recipe-suggester"

export default async function SuggestPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return <RecipeSuggester />
}
