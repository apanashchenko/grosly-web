import { parse, Allow } from "partial-json"
import type { AuthResponse } from "@/lib/types"
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "@/lib/auth/storage"
import { API_BASE } from "./client"

export interface StreamCallbacks<T> {
  onPartial?: (partial: Partial<T>) => void
  onDone: (data: T) => void
  onError: (error: Error) => void
}

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

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  }
  const token = getAccessToken()
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

async function doStreamFetch(
  path: string,
  body: string,
  signal?: AbortSignal,
): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: buildHeaders(),
    body,
    signal,
  })
}

export async function streamRequest<T>(
  path: string,
  body: Record<string, unknown>,
  callbacks: StreamCallbacks<T>,
  signal?: AbortSignal,
): Promise<void> {
  const bodyStr = JSON.stringify(body)

  let response = await doStreamFetch(path, bodyStr, signal)

  // Handle 401 with token refresh
  if (response.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      response = await doStreamFetch(path, bodyStr, signal)
    } else {
      callbacks.onError(new Error("SESSION_EXPIRED"))
      return
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const message = Array.isArray(errorData?.message)
      ? errorData.message[0]
      : errorData?.message ?? "Something went wrong. Please try again."
    callbacks.onError(new Error(message))
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    callbacks.onError(new Error("No response body"))
    return
  }

  const decoder = new TextDecoder()
  let sseBuffer = ""
  let jsonBuffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      sseBuffer += decoder.decode(value, { stream: true })
      const parts = sseBuffer.split("\n\n")
      sseBuffer = parts.pop()!

      for (const part of parts) {
        const eventMatch = part.match(/^event: (.+)$/m)
        const dataMatch = part.match(/^data: (.+)$/m)
        if (!eventMatch || !dataMatch) continue

        const event = eventMatch[1]
        const dataStr = dataMatch[1]

        try {
          const parsed = JSON.parse(dataStr)

          switch (event) {
            case "chunk":
              jsonBuffer += parsed.text
              if (callbacks.onPartial) {
                try {
                  const partial = parse(jsonBuffer, Allow.ALL) as Partial<T>
                  callbacks.onPartial(partial)
                } catch {
                  // not enough data yet
                }
              }
              break
            case "done":
              callbacks.onDone(parsed as T)
              return
            case "error":
              callbacks.onError(new Error(parsed.message))
              return
          }
        } catch {
          // Malformed SSE data, skip
        }
      }
    }
  } catch (err) {
    if (signal?.aborted) return
    callbacks.onError(
      err instanceof Error ? err : new Error("Stream interrupted"),
    )
  }
}
