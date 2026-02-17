"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Link, usePathname } from "@/i18n/navigation"
import {
  BarChart3,
  Bookmark,
  ChefHat,
  Sparkles,
  Lightbulb,
  PenLine,
  ClipboardList,
  ShoppingCart,
  Settings,
  Tag,
  Menu,
  LogOut,
  Users,
  User as UserIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"
import { Logo } from "@/components/shared/logo"
import { getMyInvitations } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"

interface NavItem {
  href: string
  icon: typeof ChefHat
  key: string
}

interface NavGroup {
  labelKey?: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: "mealPlansGroup",
    items: [
      { href: "/meal-plans/new", icon: PenLine, key: "createPlan" },
      { href: "/meal-plan", icon: Sparkles, key: "generatePlan" },
      { href: "/meal-plans", icon: ClipboardList, key: "mealPlans" },
    ],
  },
  {
    labelKey: "shoppingListGroup",
    items: [
      { href: "/shopping-list", icon: ShoppingCart, key: "shoppingList" },
    ],
  },
  {
    labelKey: "recipes",
    items: [
      { href: "/recipes/new", icon: PenLine, key: "manualRecipe" },
      { href: "/parse", icon: ChefHat, key: "parseRecipe" },
      { href: "/single", icon: Sparkles, key: "generateRecipe" },
      { href: "/suggest", icon: Lightbulb, key: "suggestRecipes" },
      { href: "/recipes", icon: Bookmark, key: "savedRecipes" },
    ],
  },
  {
    items: [
      { href: "/spaces", icon: Users, key: "spaces" },
    ],
  },
  {
    labelKey: "settings",
    items: [
      { href: "/analytics", icon: BarChart3, key: "analytics" },
      { href: "/categories", icon: Tag, key: "categories" },
      { href: "/preferences", icon: Settings, key: "preferences" },
    ],
  },
]

export function NavBar() {
  const t = useTranslations("Nav")
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const [invitationCount, setInvitationCount] = useState(0)

  useEffect(() => {
    if (!isAuthenticated) return
    getMyInvitations()
      .then((data) => setInvitationCount(data.filter((i) => i.status === "PENDING").length))
      .catch(() => {})
  }, [isAuthenticated])

  // While loading or not authenticated, show minimal header
  if (isLoading || !isAuthenticated) {
    return (
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md shadow-sm supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <span className="inline-flex items-center gap-2">
            <Logo iconSize={22} />
            <span className="text-lg font-extrabold tracking-tight text-primary">{t("brand")}</span>
          </span>
        </div>
      </nav>
    )
  }

  return (
    <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md shadow-sm supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle className="inline-flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-tight text-primary">{t("brand")}</span>
                <Logo iconSize={22} />
              </SheetTitle>
              <SheetDescription>
                {t("subtitle")}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4">
              <div className="flex flex-col gap-1">
                {NAV_GROUPS.map((group, groupIndex) => (
                  <div key={group.labelKey ?? group.items[0]?.key}>
                    {groupIndex > 0 && <Separator className="my-3" />}
                    {group.labelKey && (
                      <h3 className="mb-1 px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {t(group.labelKey)}
                      </h3>
                    )}
                    {group.items.map((item) => {
                      const isActive = pathname === item.href
                      return (
                        <Button
                          key={item.href}
                          variant="ghost"
                          className={cn(
                            "w-full justify-start gap-3 pl-4 transition-all duration-200",
                            isActive
                              ? "bg-primary/10 font-medium text-primary border-l-2 border-primary"
                              : "hover:translate-x-0.5"
                          )}
                          asChild
                          onClick={() => setOpen(false)}
                        >
                          <Link href={item.href}>
                            <item.icon className="size-4" />
                            {t(item.key)}
                            {item.key === "spaces" && invitationCount > 0 && (
                              <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
                                {invitationCount}
                              </span>
                            )}
                          </Link>
                        </Button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* User section at bottom of sidebar */}
            {user && (
              <div className="mt-auto border-t border-border/50 px-4 py-3">
                <div className="flex items-center gap-3 py-1">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="size-8 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                      <UserIcon className="size-4 text-primary" />
                    </div>
                  )}
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">
                      {user.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 pl-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={async () => {
                    setOpen(false)
                    await logout()
                  }}
                >
                  <LogOut className="size-4" />
                  {t("logout")}
                </Button>
              </div>
            )}
          </SheetContent>
        </Sheet>

        <Link href="/" className="inline-flex items-center gap-2">
          <Logo iconSize={22} />
          <span className="text-lg font-extrabold tracking-tight text-primary">{t("brand")}</span>
        </Link>
      </div>
    </nav>
  )
}
