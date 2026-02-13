import { setRequestLocale } from "next-intl/server"
import { ManualMealPlanCreator } from "@/components/meal-plans/manual-meal-plan-creator"

export default async function ManualMealPlanPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return <ManualMealPlanCreator />
}
