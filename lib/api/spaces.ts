import type {
  SpaceResponse,
  CreateSpaceRequest,
  UpdateSpaceRequest,
  InviteToSpaceRequest,
  RespondToInvitationRequest,
  InvitationResponse,
} from "@/lib/types"
import { request } from "./client"

// --- Spaces CRUD ---

export function getSpaces() {
  return request<SpaceResponse[]>("/spaces")
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
