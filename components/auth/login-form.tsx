"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { LogIn } from "lucide-react"
import { useAuth } from "@/lib/auth"
import {
  initializeGoogleSignIn,
  type GoogleCredentialResponse,
} from "@/lib/auth/google"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"

export function LoginForm() {
  const t = useTranslations("Auth")
  const locale = useLocale()
  const { login, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const buttonRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)

  // If already authenticated, redirect away
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/")
    }
  }, [isLoading, isAuthenticated, router])

  // Initialize Google button once SDK is loaded
  useEffect(() => {
    if (isLoading || isAuthenticated) return

    const handleCredential = async (response: GoogleCredentialResponse) => {
      setLoggingIn(true)
      setError(null)
      try {
        await login(response.credential)
      } catch (err) {
        setError(err instanceof Error ? err.message : t("unexpectedError"))
      } finally {
        setLoggingIn(false)
      }
    }

    // Delay slightly to ensure the SDK script has loaded
    const timer = setTimeout(() => {
      if (buttonRef.current) {
        initializeGoogleSignIn(buttonRef.current, handleCredential, locale)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [isLoading, isAuthenticated, login, locale, t])

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-8 px-4 py-12 md:py-20">
      {/* Page header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl text-primary">
          {t("heading")}
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          {t("subtitle")}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="h-0.5 w-6 rounded-full bg-gradient-to-r from-primary to-primary/60" />
          <span className="h-0.5 w-3 rounded-full bg-gradient-to-r from-primary/60 to-accent/80" />
          <span className="h-0.5 w-1.5 rounded-full bg-accent/60" />
        </div>
      </div>

      {/* Login card */}
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <LogIn className="size-5 text-primary" />
            {t("signInTitle")}
          </CardTitle>
          <CardDescription>{t("signInDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {/* Google Sign-In button renders here */}
          <div ref={buttonRef} className="flex justify-center" />

          {loggingIn && (
            <p className="text-sm text-muted-foreground">{t("signingIn")}</p>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
