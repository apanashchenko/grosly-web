export interface User {
  id: string
  email: string
  name: string
  avatarUrl: string
  language: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}
