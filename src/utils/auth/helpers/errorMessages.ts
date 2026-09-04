/**
 * User-Friendly Authentication Error Messages
 *
 * Centralized error message handling for Firebase authentication errors.
 * Provides clear, actionable messages for users instead of technical error codes.
 */

/**
 * Maps Firebase auth error codes to user-friendly messages
 */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  // Login/Authentication Errors
  'auth/invalid-credential': 'The email or password you entered is incorrect. Please try again.',
  'auth/wrong-password': 'The password you entered is incorrect. Please try again.',
  'auth/user-not-found': 'We couldn\'t find an account with this email address. Please check your email or sign up.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Please contact support for assistance.',
  'auth/too-many-requests': 'Too many unsuccessful attempts. Please wait a few minutes before trying again.',
  'auth/network-request-failed': 'Unable to connect. Please check your internet connection and try again.',

  // Signup/Registration Errors
  'auth/email-already-in-use': 'An account with this email already exists. Try logging in instead.',
  'auth/weak-password': 'Please choose a stronger password. Use at least 8 characters with uppercase, lowercase, and numbers.',
  'auth/operation-not-allowed': 'Account creation is currently unavailable. Please try again later or contact support.',

  // Password Reset Errors
  'auth/expired-action-code': 'This link has expired. Please request a new password reset link.',
  'auth/invalid-action-code': 'This link is no longer valid. Please request a new password reset link.',
  'auth/user-token-expired': 'Your session has expired. Please log in again.',

  // Token/Session Errors
  'auth/requires-recent-login': 'For your security, please log in again to complete this action.',
  'auth/invalid-user-token': 'Your session is no longer valid. Please log in again.',
  'auth/null-user': 'No user is currently logged in. Please log in to continue.',

  // General Errors
  'auth/internal-error': 'Something went wrong on our end. Please try again in a moment.',
  'auth/quota-exceeded': 'We\'re experiencing high demand. Please try again shortly.',
  'auth/unauthorized-continue-uri': 'There was an issue with the redirect. Please try again.',
  'auth/invalid-continue-uri': 'There was an issue with the redirect. Please try again.',
}

/**
 * Success messages for various auth operations
 */
export const AUTH_SUCCESS_MESSAGES = {
  login: {
    title: 'Welcome back!',
    description: 'You\'ve successfully logged in to your account.',
  },
  signup: {
    title: 'Account created!',
    description: 'Welcome! Your account has been successfully created.',
  },
  passwordResetSent: {
    title: 'Check your email',
    description: 'We\'ve sent password reset instructions to your email address.',
  },
  passwordResetComplete: {
    title: 'Password updated!',
    description: 'Your password has been successfully changed. You can now log in with your new password.',
  },
  logout: {
    title: 'Logged out',
    description: 'You\'ve been successfully logged out. See you soon!',
  },
}

/**
 * Validation error messages
 */
export const VALIDATION_MESSAGES = {
  email: {
    required: 'Please enter your email address.',
    invalid: 'Please enter a valid email address.',
  },
  password: {
    required: 'Please enter your password.',
    tooShort: 'Password must be at least 8 characters long.',
    missingLowercase: 'Password must include at least one lowercase letter.',
    missingUppercase: 'Password must include at least one uppercase letter.',
    missingNumber: 'Password must include at least one number.',
    tooWeak: 'Please choose a stronger password.',
  },
  confirmPassword: {
    required: 'Please confirm your password.',
    mismatch: 'Passwords don\'t match. Please try again.',
  },
  fullName: {
    required: 'Please enter your full name.',
    tooShort: 'Please enter your full name (at least 2 characters).',
    invalid: 'Please use only letters and spaces in your name.',
  },
  form: {
    incomplete: 'Please complete all required fields.',
    invalid: 'Please fix the errors in the form before continuing.',
  },
}

/**
 * Shape of a Firebase Auth error (or anything close enough to one)
 */
type FirebaseErrorLike = { code?: string; message?: string }

function asFirebaseError(error: unknown): FirebaseErrorLike {
  return typeof error === 'object' && error !== null ? (error as FirebaseErrorLike) : {}
}

/** One entry from a Joi validation failure, as the API returns them. */
export interface ApiFieldError {
  field: string
  message: string
  type?: string
}

/** The `{ success, error, message, details }` envelope every backend route replies with. */
interface ApiErrorBody {
  error?: string
  message?: string
  details?: ApiFieldError[]
  reason?: string
}

function apiErrorBody(error: unknown): ApiErrorBody | null {
  const data = (error as { response?: { data?: unknown } })?.response?.data
  return data && typeof data === 'object' ? (data as ApiErrorBody) : null
}

/** HTTP status of a failed request, or null when it wasn't an HTTP error. */
export function getApiErrorStatus(error: unknown): number | null {
  return (error as { response?: { status?: number } })?.response?.status ?? null
}

/** The backend's machine-readable reason code, when it sent one (e.g. `already_signed`). */
export function getApiErrorReason(error: unknown): string | null {
  return apiErrorBody(error)?.reason ?? null
}

/**
 * Per-field validation failures, for rendering against the inputs that caused them.
 * Empty when the error wasn't a validation rejection.
 */
export function getApiFieldErrors(error: unknown): ApiFieldError[] {
  const details = apiErrorBody(error)?.details
  if (!Array.isArray(details)) return []
  return details.filter(
    (item): item is ApiFieldError =>
      Boolean(item) && typeof item.field === 'string' && typeof item.message === 'string',
  )
}

/** "Heart rate must be at least 20" — drops Joi's quoted dotted paths. */
function humanizeFieldError({ field, message }: ApiFieldError): string {
  const leaf = field.split('.').pop() || field
  const label = leaf
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
  const cleaned = message
    .replace(new RegExp(`"${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'), label)
    .replace(/"/g, '')
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

/**
 * Get a user-friendly message for a failed request or Firebase auth error.
 *
 * Reads the API's response body before falling back to `error.message`. Without that step
 * an axios rejection surfaces as "Request failed with status code 400" and the backend's
 * actual explanation — including per-field Joi validation messages — is thrown away.
 */
export function getAuthErrorMessage(error: unknown): string {
  if (!error) {
    return 'An unexpected error occurred. Please try again.'
  }

  const { code, message } = asFirebaseError(error)

  if (code && AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code]
  }

  // The API's own words beat a generic transport message.
  const body = apiErrorBody(error)
  if (body) {
    const fieldErrors = getApiFieldErrors(error)
    if (fieldErrors.length) {
      return fieldErrors.map(humanizeFieldError).join('. ')
    }
    const fromBody = body.error || body.message
    if (typeof fromBody === 'string' && fromBody.trim()) return fromBody.trim()
  }

  if (message) {
    const msg = String(message)
    // "Request failed with status code 400" tells the user nothing; prefer the generic copy.
    if (
      !msg.includes('auth/') &&
      !msg.includes('Firebase') &&
      !/^Request failed with status code/i.test(msg)
    ) {
      return msg
    }
  }

  return 'Something went wrong. Please try again or contact support if the problem persists.'
}

/**
 * Get validation error message for form fields
 */
export function getValidationMessage(
  field: 'email' | 'password' | 'confirmPassword' | 'fullName' | 'form',
  validationType: string
): string {
  const fieldMessages = VALIDATION_MESSAGES[field] as Record<string, string>
  return fieldMessages[validationType] || `Please enter a valid ${field}.`
}

/**
 * Format success message for toast notifications
 */
export function getSuccessMessage(operation: keyof typeof AUTH_SUCCESS_MESSAGES) {
  return AUTH_SUCCESS_MESSAGES[operation] || {
    title: 'Success',
    description: 'Operation completed successfully.',
  }
}

/**
 * Check if error is a network-related error
 */
export function isNetworkError(error: unknown): boolean {
  const { code, message } = asFirebaseError(error)
  return (
    code === 'auth/network-request-failed' ||
    !!message?.toLowerCase().includes('network') ||
    !!message?.toLowerCase().includes('connection')
  )
}

/**
 * Check if error requires user to log in again
 */
export function requiresReauth(error: unknown): boolean {
  const { code } = asFirebaseError(error)
  return (
    code === 'auth/requires-recent-login' ||
    code === 'auth/user-token-expired' ||
    code === 'auth/invalid-user-token'
  )
}

/**
 * Check if error is related to expired/invalid action codes (password reset links, etc.)
 */
export function isExpiredActionCode(error: unknown): boolean {
  const { code } = asFirebaseError(error)
  return (
    code === 'auth/expired-action-code' ||
    code === 'auth/invalid-action-code'
  )
}
