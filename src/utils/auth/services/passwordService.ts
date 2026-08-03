/**
 * In-app password change for MFA-enrolled accounts.
 *
 * Firebase requires a recent login before updatePassword. Re-authenticating with the
 * current password throws `auth/multi-factor-auth-required` for MFA users, which yields
 * a MultiFactorResolver we resolve with the existing phone-SMS primitives from mfaService.
 */
import { auth } from "@/lib/firebase"
import { createRecaptchaVerifier, startMfaSignInChallenge, completeMfaSignIn } from "./mfaService"

type MultiFactorResolver = import("firebase/auth").MultiFactorResolver

export type ReauthResult =
  | { status: "done" }
  | { status: "mfa"; resolver: MultiFactorResolver }

/**
 * Re-authenticate with the current password. Returns `done` when no MFA is required,
 * or `mfa` with a resolver to complete the phone challenge.
 */
export async function reauthenticate(currentPassword: string): Promise<ReauthResult> {
  const { EmailAuthProvider, reauthenticateWithCredential, getMultiFactorResolver } = await import("firebase/auth")
  const user = auth.currentUser
  if (!user || !user.email) throw new Error("You must be signed in to change your password.")

  const credential = EmailAuthProvider.credential(user.email, currentPassword)
  try {
    await reauthenticateWithCredential(user, credential)
    return { status: "done" }
  } catch (error) {
    if ((error as { code?: string })?.code === "auth/multi-factor-auth-required") {
      const resolver = getMultiFactorResolver(auth, error as import("firebase/auth").MultiFactorError)
      return { status: "mfa", resolver }
    }
    throw error
  }
}

/** Send the SMS code for the reauth MFA challenge; returns a verificationId. */
export async function sendReauthOtp(resolver: MultiFactorResolver, recaptchaContainerId: string): Promise<string> {
  const recaptcha = await createRecaptchaVerifier(recaptchaContainerId)
  return startMfaSignInChallenge(resolver, recaptcha)
}

/** Complete the reauth MFA challenge with the SMS code. */
export async function completeReauthOtp(
  resolver: MultiFactorResolver,
  verificationId: string,
  smsCode: string,
): Promise<void> {
  await completeMfaSignIn(resolver, verificationId, smsCode)
}

/** Set the new password (requires a fresh reauth immediately beforehand). */
export async function changePassword(newPassword: string): Promise<void> {
  const { updatePassword } = await import("firebase/auth")
  const user = auth.currentUser
  if (!user) throw new Error("You must be signed in to change your password.")
  await updatePassword(user, newPassword)
}
