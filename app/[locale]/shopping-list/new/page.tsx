import { Suspense } from "react"
import { setRequestLocale } from "next-intl/server"
import { ShoppingListNew } from "@/components/shopping-list/shopping-list-new"

export default async function NewShoppingListPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <Suspense>
      <ShoppingListNew />
    </Suspense>
  )
}
