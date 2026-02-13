import { type NextRequest } from "next/server"
import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"

const intlMiddleware = createMiddleware(routing)

export default function middleware(request: NextRequest) {
  // Map Russian (ru) Accept-Language to Ukrainian (uk)
  const acceptLanguage = request.headers.get("accept-language") ?? ""
  if (/\bru\b/i.test(acceptLanguage)) {
    request.headers.set("accept-language", acceptLanguage.replace(/\bru\b/gi, "uk"))
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
}
