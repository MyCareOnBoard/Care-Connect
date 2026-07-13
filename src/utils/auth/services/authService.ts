/**
 * Auth Service
 *
 * Helper functions for authentication operations with Firebase
 */

import { auth } from '@/lib/firebase'
import axiosClient from '@/lib/axios'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signOut,
  updateProfile,
  verifyPasswordResetCode,
  confirmPasswordReset,
  deleteUser,
  type User as FirebaseUser,
} from 'firebase/auth'
import type { User, UserType } from '../types/user.types'
import type { LoginResponse } from '../types/login.types'
import { getAuthErrorMessage } from '../helpers/errorMessages'
import { storeMfaResolver } from './mfaService'

/**
 * Shape of the backend's GET /users/profile response, merged onto the Firebase-derived User.
 */
export interface BackendUserProfile {
  uid: string
  email: string
  fullName: string
  userType: UserType
  onboardingCompleted?: boolean
  /**
   * Whether this account has completed the CareConnect setup wizard. Tracked separately
   * from `onboardingCompleted` (which the legacy Care-On-Board app also writes), so that a
   * cross-over user is still routed through CareConnect onboarding on login.
   */
  careConnectOnboardingCompleted?: boolean
  otpVerified?: boolean
  agencyId?: string
  profile?: Record<string, unknown> | null
  agency?: Record<string, unknown> | null
}

export interface CareConnectProfileFields {
  organizationName?: string
  organizationType?: string
  organizationInterests?: string[]
  profession?: string
  certifications?: string[]
}

export interface AuthResponse {
  success: boolean
  user?: User
  error?: string
}

/**
 * Transform Firebase User to our User type
 */
export function transformFirebaseUser(firebaseUser: FirebaseUser): User {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    fullName: firebaseUser.displayName || '',
    emailVerified: firebaseUser.emailVerified,
    createdAt: firebaseUser.metadata.creationTime
      ? new Date(firebaseUser.metadata.creationTime)
      : new Date(),
    updatedAt: new Date(),
    photoURL: firebaseUser.photoURL || undefined,
    phoneNumber: firebaseUser.phoneNumber || undefined,
  }
}

export type { LoginResponse, LoginResult } from '../types/login.types'

/**
 * Login with email and password using Firebase
 */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<LoginResponse> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const user = transformFirebaseUser(userCredential.user)

    return { status: 'success', user }
  } catch (error: unknown) {
    const mfaRequired = await storeMfaResolver(error, email)
    if (mfaRequired) {
      return { status: 'mfa_required' }
    }

    console.error('Login error:', error)

    return {
      status: 'error',
      error: getAuthErrorMessage(error),
    }
  }
}

/**
 * Register new user with Firebase
 */
export async function registerWithEmail(fullName: string, email: string, password: string): Promise<AuthResponse> {
  try {
    if (password.length < 6) {
      return {
        success: false,
        error: 'Password must be at least 6 characters',
      }
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password)

    await updateProfile(userCredential.user, {
      displayName: fullName,
    })

    await userCredential.user.reload()
    const user = transformFirebaseUser(userCredential.user)

    return {
      success: true,
      user,
    }
  } catch (error: unknown) {
    console.error('Registration error:', error)

    return {
      success: false,
      error: getAuthErrorMessage(error),
    }
  }
}

/**
 * Send password reset email using Firebase
 */
export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    await firebaseSendPasswordResetEmail(auth, email)

    return {
      success: true,
    }
  } catch (error: unknown) {
    console.error('Password reset error:', error)

    return {
      success: false,
      error: getAuthErrorMessage(error),
    }
  }
}

/**
 * Verify password reset code before showing the new-password form
 */
export async function verifyResetCode(code: string): Promise<{ success: boolean; email?: string; error?: string }> {
  try {
    const email = await verifyPasswordResetCode(auth, code)

    return {
      success: true,
      email,
    }
  } catch (error: unknown) {
    console.error('Reset code verification error:', error)

    return {
      success: false,
      error: getAuthErrorMessage(error) || 'Invalid or expired reset code',
    }
  }
}

/**
 * Confirm password reset with new password
 */
export async function confirmReset(code: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    await confirmPasswordReset(auth, code, newPassword)

    return {
      success: true,
    }
  } catch (error: unknown) {
    console.error('Password reset confirmation error:', error)

    return {
      success: false,
      error: getAuthErrorMessage(error) || 'Failed to reset password',
    }
  }
}

/**
 * Create the backend profile doc for a freshly-created Firebase account.
 * userType is restricted server-side to applicant/careconnect_individual/careconnect_company.
 */
export async function createBackendUserProfile(
  fullName: string,
  userType: 'careconnect_individual' | 'careconnect_company'
): Promise<BackendUserProfile> {
  const { data } = await axiosClient.post('/users', { fullName, userType })
  return data.user
}

/**
 * Fetch the backend profile for the signed-in Firebase user.
 */
export async function getUserProfile(): Promise<BackendUserProfile> {
  const { data } = await axiosClient.get('/users/profile')
  return data.user
}

/**
 * Progressively save CareConnect-specific wizard fields (organization info, profession, etc.)
 */
export async function updateCareConnectProfile(
  fields: CareConnectProfileFields
): Promise<void> {
  await axiosClient.put('/users/careconnect-profile', fields)
}

/**
 * Upload a resume/cover-letter/certification document for a CareConnect account.
 */
export async function uploadCareConnectDocument(
  file: File,
  documentType: 'resume' | 'coverLetter' | 'certification'
): Promise<{ url: string; fileName: string }> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('documentType', documentType)

  // Let the browser set Content-Type (with multipart boundary) automatically for FormData.
  const { data } = await axiosClient.post('/careconnectDocumentUpload', formData)
  return data.data
}

/**
 * Mark the CareConnect setup wizard as complete (final step of onboarding).
 * Writes to the CareConnect profile rather than the shared `users.onboardingCompleted`
 * flag, so completing CareConnect onboarding never touches a cross-over user's
 * Care-On-Board onboarding state.
 */
export async function completeOnboarding(): Promise<void> {
  await axiosClient.put('/users/careconnect-profile', { onboardingCompleted: true })
}

/**
 * Send a 6-digit email OTP to the signed-in user (verify-contact step).
 */
export async function sendOtp(): Promise<void> {
  await axiosClient.post('/otp/send')
}

/**
 * Verify the 6-digit email OTP. Marks the backend profile otpVerified: true on success.
 */
export async function verifyOtp(otp: string): Promise<void> {
  await axiosClient.post('/otp/verify', { otp })
}

/**
 * Invalidate the existing OTP and send a new one.
 */
export async function resendOtp(): Promise<void> {
  await axiosClient.post('/otp/resend')
}

/**
 * Check whether the signed-in user has already completed email OTP verification.
 */
export async function getOtpStatus(): Promise<boolean> {
  const { data } = await axiosClient.get('/otp/status')
  return Boolean(data.otpVerified)
}

/**
 * Roll back a just-created Firebase account (used when backend profile creation fails
 * right after signup, keeping Firebase Auth and the backend profile in sync).
 */
export async function deleteCurrentFirebaseUser(): Promise<void> {
  if (auth.currentUser) {
    await deleteUser(auth.currentUser)
  }
}

/**
 * Logout current user
 */
export async function logout(): Promise<void> {
  try {
    await signOut(auth)
  } catch (error) {
    console.error('Logout error:', error)
    throw error
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      unsubscribe()

      if (firebaseUser) {
        resolve(transformFirebaseUser(firebaseUser))
      } else {
        resolve(null)
      }
    })
  })
}

/**
 * Get Firebase ID token for the current user
 * Use this to send authenticated requests to your backend
 */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser

  if (!user) {
    return null
  }

  try {
    return await user.getIdToken(forceRefresh)
  } catch (error) {
    console.error('Error getting ID token:', error)
    return null
  }
}

/**
 * Store user data in localStorage
 */
export function storeUserData(user: User): void {
  try {
    localStorage.setItem('auth_user', JSON.stringify(user))
  } catch (error) {
    console.error('Failed to store user data:', error)
  }
}

/**
 * Remove user data from localStorage
 */
export function removeUserData(): void {
  try {
    localStorage.removeItem('auth_user')
  } catch (error) {
    console.error('Failed to remove user data:', error)
  }
}
