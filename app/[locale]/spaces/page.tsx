import { setRequestLocale } from "next-intl/server"
import { SpacesManager } from "@/components/spaces/spaces-manager"

export default async function SpacesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return <SpacesManager />
}
