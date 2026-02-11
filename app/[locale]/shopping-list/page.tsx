import { Suspense } from "react"
import { setRequestLocale } from "next-intl/server"
import { ShoppingListIndex } from "@/components/shopping-list/shopping-list-index"

export default async function ShoppingListPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <Suspense>
      <ShoppingListIndex />
    </Suspense>
  )
}
