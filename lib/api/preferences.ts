import type {
  Allergy,
  DietaryRestriction,
  UserPreferencesResponse,
  UpdateUserPreferencesRequest,
} from "@/lib/types"
import { request } from "./client"

export function getAllergies() {
  return request<Allergy[]>("/allergies")
}

export function getDietaryRestrictions() {
  return request<DietaryRestriction[]>("/dietary-restrictions")
}

export function getUserPreferences() {
  return request<UserPreferencesResponse>("/users/me/preferences")
}

export function updateUserPreferences(data: UpdateUserPreferencesRequest) {
  return request<UserPreferencesResponse>("/users/me/preferences", {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}
