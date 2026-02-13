import { setRequestLocale } from "next-intl/server"
import { MealPlansList } from "@/components/meal-plans/meal-plans-list"

export default async function MealPlansPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return <MealPlansList />
}
