"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Link, usePathname } from "@/i18n/navigation"
import {
  Bookmark,
  ChefHat,
  Sparkles,
  Lightbulb,
  CalendarDays,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface NavItem {
  href: string
  icon: typeof ChefHat
  key: string
}

interface NavGroup {
  labelKey: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: "recipes",
    items: [
      { href: "/", icon: ChefHat, key: "parseRecipe" },
      { href: "/single", icon: Sparkles, key: "generateRecipe" },
      { href: "/meal-plan", icon: CalendarDays, key: "mealPlan" },
      { href: "/suggest", icon: Lightbulb, key: "suggestRecipes" },
      { href: "/recipes", icon: Bookmark, key: "savedRecipes" },
    ],
  },
  {
    labelKey: "lists",
    items: [
      { href: "/shopping-list", icon: ShoppingCart, key: "shoppingList" },
      { href: "/spaces", icon: Users, key: "spaces" },
    ],
  },
  {
    labelKey: "settings",
    items: [
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

  // While loading or not authenticated, show minimal header
  if (isLoading || !isAuthenticated) {
    return (
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md shadow-sm supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <span className="text-lg font-bold tracking-tight gradient-text">
            {t("brand")}
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
              <SheetTitle>{t("brand")}</SheetTitle>
              <SheetDescription>{t("subtitle")}</SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-1 px-4">
              {NAV_GROUPS.map((group, groupIndex) => (
                <div key={group.labelKey}>
                  {groupIndex > 0 && <Separator className="my-3" />}
                  <h3 className="mb-1 px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {t(group.labelKey)}
                  </h3>
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
                        </Link>
                      </Button>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* User section at bottom of sidebar */}
            {user && (
              <>
                <Separator className="my-3 mx-4" />
                <div className="flex items-center gap-3 px-4 py-2">
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
                <div className="px-4 pt-1">
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
              </>
            )}
          </SheetContent>
        </Sheet>

        <Link href="/" className="text-lg font-bold tracking-tight gradient-text">
          {t("brand")}
        </Link>

        {/* User avatar in top-right */}
        <div className="ml-auto">
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="size-7 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <UserIcon className="size-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{user.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => logout()}
                >
                  <LogOut className="size-4" />
                  {t("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  )
}
