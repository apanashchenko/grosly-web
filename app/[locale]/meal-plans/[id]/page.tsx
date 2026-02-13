import { setRequestLocale } from "next-intl/server"
import { MealPlanDetail } from "@/components/meal-plans/meal-plan-detail"

export default async function MealPlanDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)

  return <MealPlanDetail planId={id} />
}
