/**
 * User Profile data shape matching backend API response
 */
export interface User {
  uid: string
  email: string
  fullName: string
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
  photoURL?: string
  phoneNumber?: string
}

/**
 * Auth state for Redux
 */
export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string
  password: string
}

/**
 * Signup credentials
 */
export interface SignupCredentials {
  email: string
  password: string
  fullName: string
}
