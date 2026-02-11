import type { AuthResponse } from "@/lib/types"
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "@/lib/auth/storage"

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"

// Paths that should never have auth headers or trigger refresh
const AUTH_PATHS = ["/auth/google", "/auth/refresh"]

// Singleton refresh promise to deduplicate concurrent refresh calls
let refreshPromise: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) {
      clearTokens()
      return false
    }

    const data: AuthResponse = await response.json()
    setTokens(data.accessToken, data.refreshToken)
    return true
  } catch {
    clearTokens()
    return false
  }
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isAuthPath = AUTH_PATHS.some((p) => path.startsWith(p))

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  }

  if (!isAuthPath) {
    const token = getAccessToken()
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  // Handle 401: attempt refresh (skip for auth endpoints to avoid loops)
  if (response.status === 401 && !isAuthPath) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null
      })
    }

    const refreshed = await refreshPromise

    if (refreshed) {
      // Retry with new token
      const retryHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options?.headers as Record<string, string>),
      }
      const newToken = getAccessToken()
      if (newToken) {
        retryHeaders["Authorization"] = `Bearer ${newToken}`
      }

      const retryResponse = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: retryHeaders,
      })

      if (!retryResponse.ok) {
        const errorData = await retryResponse.json().catch(() => null)
        const message =
          Array.isArray(errorData?.message)
            ? errorData.message[0]
            : errorData?.message ??
              (retryResponse.status === 400
                ? "Invalid request. Please check your input."
                : "Something went wrong. Please try again.")
        throw new Error(message)
      }

      if (retryResponse.status === 204) {
        return undefined as T
      }

      return retryResponse.json()
    }

    // Refresh failed — session expired
    throw new Error("SESSION_EXPIRED")
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const message =
      Array.isArray(errorData?.message)
        ? errorData.message[0]
        : errorData?.message ??
          (response.status === 400
            ? "Invalid request. Please check your input."
            : "Something went wrong. Please try again.")
    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}
