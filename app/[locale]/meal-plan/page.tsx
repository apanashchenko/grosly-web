import { setRequestLocale } from "next-intl/server"
import { MealPlanner } from "@/components/recipes/meal-planner"

export default async function MealPlanPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return <MealPlanner />
}
