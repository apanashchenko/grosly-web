import type {
  ShoppingListResponse,
  CreateShoppingListRequest,
  UpdateShoppingListRequest,
  ShoppingListItemRequest,
  UpdateShoppingListItemRequest,
  CombineShoppingListsRequest,
  PaginatedResponse,
  PaginationParams,
} from "@/lib/types"
import { request } from "./client"
import { buildPaginationQuery } from "./utils"

function spaceHeaders(spaceId?: string): Record<string, string> | undefined {
  return spaceId ? { "X-Space-Id": spaceId } : undefined
}

export function getShoppingLists(params?: PaginationParams, spaceId?: string, signal?: AbortSignal) {
  const qs = buildPaginationQuery(params)
  return request<PaginatedResponse<ShoppingListResponse>>(`/shopping-list${qs}`, {
    headers: spaceHeaders(spaceId),
    signal,
  })
}

export function getShoppingList(id: string, spaceId?: string) {
  return request<ShoppingListResponse>(`/shopping-list/${encodeURIComponent(id)}`, {
    headers: spaceHeaders(spaceId),
  })
}

export function createShoppingList(data: CreateShoppingListRequest, spaceId?: string) {
  return request<ShoppingListResponse>("/shopping-list", {
    method: "POST",
    body: JSON.stringify(data),
    headers: spaceHeaders(spaceId),
  })
}

export function updateShoppingList(id: string, data: UpdateShoppingListRequest, spaceId?: string) {
  return request<ShoppingListResponse>(`/shopping-list/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    headers: spaceHeaders(spaceId),
  })
}

export function deleteShoppingList(id: string, spaceId?: string) {
  return request<void>(`/shopping-list/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: spaceHeaders(spaceId),
  })
}

export function addShoppingListItems(listId: string, items: ShoppingListItemRequest[], spaceId?: string) {
  return request<ShoppingListResponse>(`/shopping-list/${encodeURIComponent(listId)}/items`, {
    method: "POST",
    body: JSON.stringify({ items }),
    headers: spaceHeaders(spaceId),
  })
}

export function updateShoppingListItem(listId: string, itemId: string, data: UpdateShoppingListItemRequest, spaceId?: string) {
  return request<ShoppingListResponse>(`/shopping-list/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    headers: spaceHeaders(spaceId),
  })
}

export function deleteShoppingListItem(listId: string, itemId: string, spaceId?: string) {
  return request<ShoppingListResponse>(`/shopping-list/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
    headers: spaceHeaders(spaceId),
  })
}

export function smartGroupShoppingList(listId: string, spaceId?: string) {
  return request<ShoppingListResponse>(`/shopping-list/${encodeURIComponent(listId)}/smart-group`, {
    method: "POST",
    headers: spaceHeaders(spaceId),
  })
}

export function combineShoppingLists(data: CombineShoppingListsRequest, spaceId?: string) {
  return request<ShoppingListResponse>("/shopping-list/combine", {
    method: "POST",
    body: JSON.stringify(data),
    headers: spaceHeaders(spaceId),
  })
}
