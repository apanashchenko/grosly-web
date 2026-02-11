import type { Category, CreateCategoryRequest, UpdateCategoryRequest } from "@/lib/types"
import { request } from "./client"

export function getCategories() {
  return request<Category[]>("/categories")
}

export function createCategory(data: CreateCategoryRequest) {
  return request<Category>("/categories", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export function updateCategory(id: string, data: UpdateCategoryRequest) {
  return request<Category>(`/categories/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export function deleteCategory(id: string) {
  return request<void>(`/categories/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}
