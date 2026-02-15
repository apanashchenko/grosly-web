import { Suspense } from "react"
import { setRequestLocale } from "next-intl/server"
import { ShoppingListDetail } from "@/components/shopping-list/shopping-list-detail"

export default async function ShoppingListDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)

  return (
    <Suspense>
      <ShoppingListDetail listId={id} />
    </Suspense>
  )
}
