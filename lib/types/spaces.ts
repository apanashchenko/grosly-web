export type MemberRole = "OWNER" | "MEMBER"
export type InvitationStatus = "PENDING" | "ACCEPTED" | "DECLINED"
export type InvitationAction = "ACCEPT" | "DECLINE"

export interface SpaceMember {
  id: string
  userId: string
  name: string
  avatarUrl: string | null
  role: MemberRole
  joinedAt: string
}

export interface SpaceResponse {
  id: string
  name: string
  description: string | null
  members: SpaceMember[]
  createdAt: string
  updatedAt: string
}

export interface CreateSpaceRequest {
  name: string
  description?: string
}

export interface UpdateSpaceRequest {
  name?: string
  description?: string
}

export interface InviteToSpaceRequest {
  email: string
}

export interface RespondToInvitationRequest {
  action: InvitationAction
}

export interface InvitationResponse {
  id: string
  spaceId: string
  spaceName: string
  inviterName: string
  status: InvitationStatus
  createdAt: string
}
