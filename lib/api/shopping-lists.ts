import type {
  ShoppingListResponse,
  CreateShoppingListRequest,
  UpdateShoppingListRequest,
  ShoppingListItemRequest,
  UpdateShoppingListItemRequest,
  CombineShoppingListsRequest,
} from "@/lib/types"
import { request } from "./client"

export function getShoppingLists() {
  return request<ShoppingListResponse[]>("/shopping-list")
}

export function getShoppingList(id: string) {
  return request<ShoppingListResponse>(`/shopping-list/${encodeURIComponent(id)}`)
}

export function createShoppingList(data: CreateShoppingListRequest) {
  return request<ShoppingListResponse>("/shopping-list", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export function updateShoppingList(id: string, data: UpdateShoppingListRequest) {
  return request<ShoppingListResponse>(`/shopping-list/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export function deleteShoppingList(id: string) {
  return request<void>(`/shopping-list/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}

export function addShoppingListItems(listId: string, items: ShoppingListItemRequest[]) {
  return request<ShoppingListResponse>(`/shopping-list/${encodeURIComponent(listId)}/items`, {
    method: "POST",
    body: JSON.stringify({ items }),
  })
}

export function updateShoppingListItem(listId: string, itemId: string, data: UpdateShoppingListItemRequest) {
  return request<ShoppingListResponse>(`/shopping-list/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export function deleteShoppingListItem(listId: string, itemId: string) {
  return request<ShoppingListResponse>(`/shopping-list/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
  })
}

export function smartGroupShoppingList(listId: string) {
  return request<ShoppingListResponse>(`/shopping-list/${encodeURIComponent(listId)}/smart-group`, {
    method: "POST",
  })
}

export function combineShoppingLists(data: CombineShoppingListsRequest) {
  return request<ShoppingListResponse>("/shopping-list/combine", {
    method: "POST",
    body: JSON.stringify(data),
  })
}
