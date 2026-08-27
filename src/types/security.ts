// Named "security", not "auth", to stay distinct from the Auth0-backed
// session in stores/auth.ts — this is the mock backend's own stored
// credential, unrelated to the OAuth session.
export interface SecurityInfo {
  currentPassword: string
  passwordChangedAt: string
  activeSessionCount: number
  lastLoginAt: string
  lastLoginLocation: string
}
