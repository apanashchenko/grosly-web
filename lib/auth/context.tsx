"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import type { User } from "@/lib/types"
import {
  getAccessToken,
  setTokens,
  clearTokens,
} from "./storage"
import { googleLogin, getMe, apiLogout } from "@/lib/api"
import { useRouter, usePathname } from "@/i18n/navigation"

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (googleIdToken: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // On mount: check for existing tokens and restore session
  useEffect(() => {
    async function restoreSession() {
      const accessToken = getAccessToken()
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      try {
        const me = await getMe()
        setUser(me)
      } catch {
        clearTokens()
      } finally {
        setIsLoading(false)
      }
    }

    restoreSession()
  }, [])

  // Route protection: redirect to /login when not authenticated
  const PUBLIC_ROUTES = ["/login", "/"]
  useEffect(() => {
    if (!isLoading && !user && !PUBLIC_ROUTES.includes(pathname)) {
      router.replace("/login")
    }
  }, [isLoading, user, pathname, router])

  const login = useCallback(
    async (googleIdToken: string) => {
      const response = await googleLogin(googleIdToken)
      setTokens(response.accessToken, response.refreshToken)
      setUser(response.user)
      router.replace("/")
    },
    [router]
  )

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } catch {
      // Ignore errors — clear tokens regardless
    } finally {
      clearTokens()
      setUser(null)
      router.replace("/login")
    }
  }, [router])

  return (
    <AuthContext
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
