import { setRequestLocale } from "next-intl/server"
import { CategoriesManager } from "@/components/categories/categories-manager"

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return <CategoriesManager />
}
