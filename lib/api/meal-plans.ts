import type {
  MealPlanResponse,
  MealPlanListItem,
  CreateMealPlanRequest,
  UpdateMealPlanRequest,
  PaginatedResponse,
  PaginationParams,
} from "@/lib/types"
import { request } from "./client"
import { buildPaginationQuery } from "./utils"

export function getMealPlans(params?: PaginationParams, signal?: AbortSignal) {
  const qs = buildPaginationQuery(params)
  return request<PaginatedResponse<MealPlanListItem>>(`/meal-plans${qs}`, { signal })
}

export function getMealPlan(id: string) {
  return request<MealPlanResponse>(`/meal-plans/${encodeURIComponent(id)}`)
}

export function createMealPlan(data: CreateMealPlanRequest) {
  return request<MealPlanResponse>("/meal-plans", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export function updateMealPlan(id: string, data: UpdateMealPlanRequest) {
  return request<MealPlanResponse>(`/meal-plans/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export function deleteMealPlan(id: string) {
  return request<void>(`/meal-plans/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}
