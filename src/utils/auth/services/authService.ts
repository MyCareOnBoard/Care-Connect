/**
 * Auth Service
 *
 * Helper functions for authentication operations with Firebase
 */

import { auth } from '@/lib/firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signOut,
  updateProfile,
  verifyPasswordResetCode,
  confirmPasswordReset,
  type User as FirebaseUser,
} from 'firebase/auth'
import type { User } from '../types/user.types'
import type { LoginResponse } from '../types/login.types'
import { getAuthErrorMessage } from '../helpers/errorMessages'

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
