"use client"

import { useTranslations } from "next-intl"
import {
  ScanText,
  Sparkles,
  ShoppingCart,
  Users,
  ArrowRight,
} from "lucide-react"
import { Link } from "@/i18n/navigation"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const FEATURES = [
  { key: "parse", icon: ScanText },
  { key: "generate", icon: Sparkles },
  { key: "shopping", icon: ShoppingCart },
  { key: "spaces", icon: Users },
] as const

const STEPS = ["step1", "step2", "step3"] as const

export function LandingPage() {
  const t = useTranslations("Landing")
  const { isAuthenticated } = useAuth()

  return (
    <main className="mx-auto max-w-6xl px-4">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 py-16 text-center md:py-24">
        <h1 className="text-4xl font-bold tracking-tight gradient-text sm:text-5xl md:text-6xl">
          {t("heroTitle")}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
          {t("heroSubtitle")}
        </p>
        <div className="flex justify-center gap-2">
          <div className="h-1 w-12 rounded-full bg-gradient-to-r from-primary to-primary/50" />
          <div className="h-1 w-12 rounded-full bg-gradient-to-r from-primary/50 to-accent" />
          <div className="h-1 w-12 rounded-full bg-gradient-to-r from-accent to-accent/50" />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Button
            size="lg"
            className="bg-gradient-to-br from-primary to-primary/85 shadow-md active:scale-[0.98]"
            asChild
          >
            <Link href={isAuthenticated ? "/parse" : "/login"}>
              {isAuthenticated ? t("heroCtaAuth") : t("heroCta")}
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a href="#features">{t("heroLearnMore")}</a>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16">
        <h2 className="mb-3 text-center text-3xl font-bold tracking-tight gradient-text">
          {t("featuresTitle")}
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-center text-muted-foreground">
          {t("featuresSubtitle")}
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ key, icon: Icon }) => (
            <Card key={key}>
              <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="size-6 text-primary" />
                </div>
                <h3 className="text-base font-semibold">
                  {t(`feature.${key}.title`)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t(`feature.${key}.desc`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16">
        <h2 className="mb-3 text-center text-3xl font-bold tracking-tight gradient-text">
          {t("howItWorksTitle")}
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-center text-muted-foreground">
          {t("howItWorksSubtitle")}
        </p>
        <div className="grid gap-8 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div
              key={step}
              className="flex flex-col items-center gap-4 text-center"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/85 text-sm font-bold text-primary-foreground shadow-sm">
                {index + 1}
              </div>
              <h3 className="text-base font-semibold">{t(`${step}.title`)}</h3>
              <p className="text-sm text-muted-foreground">
                {t(`${step}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="flex flex-col items-center gap-6 py-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("ctaTitle")}
            </h2>
            <p className="max-w-lg text-muted-foreground">
              {t("ctaSubtitle")}
            </p>
            <Button
              size="lg"
              className="bg-gradient-to-br from-primary to-primary/85 shadow-md active:scale-[0.98]"
              asChild
            >
              <Link href={isAuthenticated ? "/parse" : "/login"}>
                {isAuthenticated ? t("ctaButtonAuth") : t("ctaButton")}
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
