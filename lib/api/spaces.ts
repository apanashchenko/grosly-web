import type {
  SpaceResponse,
  CreateSpaceRequest,
  UpdateSpaceRequest,
  InviteToSpaceRequest,
  RespondToInvitationRequest,
  InvitationResponse,
  SpaceInvitation,
  PaginatedResponse,
  PaginationParams,
} from "@/lib/types"
import { request } from "./client"
import { buildPaginationQuery } from "./utils"

// --- Spaces CRUD ---

export function getSpaces(params?: PaginationParams, signal?: AbortSignal) {
  const qs = buildPaginationQuery(params)
  return request<PaginatedResponse<SpaceResponse>>(`/spaces${qs}`, { signal })
}

export function getSpace(id: string) {
  return request<SpaceResponse>(`/spaces/${encodeURIComponent(id)}`)
}

export function createSpace(data: CreateSpaceRequest) {
  return request<SpaceResponse>("/spaces", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export function updateSpace(id: string, data: UpdateSpaceRequest) {
  return request<SpaceResponse>(`/spaces/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export function deleteSpace(id: string) {
  return request<void>(`/spaces/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}

// --- Invitations ---

export function inviteToSpace(spaceId: string, data: InviteToSpaceRequest) {
  return request<void>(`/spaces/${encodeURIComponent(spaceId)}/invite`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export function getMyInvitations() {
  return request<InvitationResponse[]>("/spaces/invitations/my")
}

export function getSpaceInvitations(spaceId: string) {
  return request<SpaceInvitation[]>(`/spaces/${encodeURIComponent(spaceId)}/invitations`)
}

export function deleteSpaceInvitation(spaceId: string, invitationId: string) {
  return request<void>(
    `/spaces/${encodeURIComponent(spaceId)}/invitations/${encodeURIComponent(invitationId)}`,
    { method: "DELETE" }
  )
}

export function respondToInvitation(invitationId: string, data: RespondToInvitationRequest) {
  return request<void>(
    `/spaces/invitations/${encodeURIComponent(invitationId)}/respond`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  )
}

// --- Members ---

export function removeSpaceMember(spaceId: string, userId: string) {
  return request<void>(
    `/spaces/${encodeURIComponent(spaceId)}/members/${encodeURIComponent(userId)}`,
    { method: "DELETE" }
  )
}
