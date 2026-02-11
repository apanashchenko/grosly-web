import type { AuthResponse, User } from "@/lib/types"
import { request } from "./client"

export function googleLogin(token: string) {
  return request<AuthResponse>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ token }),
  })
}

export function getMe() {
  return request<User>("/users/me")
}

export function apiLogout() {
  return request<void>("/auth/logout", {
    method: "POST",
  })
}
