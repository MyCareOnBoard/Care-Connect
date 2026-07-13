/**
 * Backend userType values. CareConnect issues the two `careconnect_*` types itself;
 * the rest belong to accounts created via Care-On-Board that share this Firebase project
 * and can log into CareConnect with the same credentials.
 */
export type UserType =
  | 'careconnect_individual'
  | 'careconnect_company'
  | 'applicant'
  | 'employee'
  | 'agency'
  | 'agency_staff'
  | 'super_admin'
  | 'family_member'

/**
 * Role-specific profile sub-document returned in `user.profile` by GET /users/profile.
 * Its shape varies by userType; the named fields below are the ones present on an
 * `agency` record (from the `agencies` collection) that CareConnect onboarding reads to
 * pre-fill the organization steps. The index signature keeps other roles' fields accessible.
 */
export interface UserProfile {
  name?: string
  agencyType?: string
  supportedClientTypes?: string[]
  [key: string]: unknown
}

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
  userType?: UserType
  onboardingCompleted?: boolean
  careConnectOnboardingCompleted?: boolean
  /** Role-specific profile sub-document (e.g. the agency record for `agency` accounts). */
  profile?: UserProfile | null
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
