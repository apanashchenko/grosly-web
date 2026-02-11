import { setRequestLocale } from "next-intl/server"
import { UserPreferences } from "@/components/preferences/user-preferences"

export default async function PreferencesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return <UserPreferences />
}
