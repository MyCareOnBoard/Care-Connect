import { auth } from "@/lib/firebase"
import { createRecaptchaVerifier, clearRecaptchaVerifier } from "@/utils/auth/services/mfaService"

/**
 * Proving a member holds a phone number, by linking it to their Firebase account.
 *
 * Used by mobile money payouts, where it is the only ownership check available: a mobile
 * money account IS a phone number, so there is no name to resolve the way a bank resolves
 * an account number, and the only thing that can show the wallet is theirs is that they
 * can receive on it.
 *
 * The verification happens entirely between the member and Firebase — Firebase sends the
 * SMS, counts the attempts and expires the code — and the server afterwards reads the
 * number off the auth record through the Admin SDK. That ordering is what makes it proof
 * rather than a claim: this code could tell the server anything, but it cannot put a number
 * on the account without answering the text.
 *
 * LINKING RATHER THAN MFA ENROLLMENT, DELIBERATELY. Enrolling would allow several numbers
 * per account, but it would also turn on login 2FA permanently — so adding a payout wallet
 * would quietly mean needing an SMS code at every sign-in, and a member who later turned
 * that off would find their payout destination had stopped working with nothing connecting
 * the two. The cost of linking is that Firebase holds one number per account, which is
 * stated plainly where a member chooses.
 */

export type PhoneLinkRefusal =
  /** The account already has a different number, and Firebase allows one. */
  | "phone_already_set"
  /** The number is verified against somebody else's account. */
  | "phone_taken"
  /** Wrong code. Survivable — they can type it again. */
  | "wrong_code"
  /** Too many tries, or it took too long. A fresh code is needed. */
  | "code_expired"
  /** Firebase refused to send: a malformed number, or its own abuse limits. */
  | "send_failed"
  /** Nobody is signed in, which should be impossible on this screen. */
  | "not_signed_in"

export type PhoneLinkStart =
  | { ok: true; confirm: (code: string) => Promise<{ ok: true } | { ok: false; reason: PhoneLinkRefusal }> }
  | { ok: false; reason: PhoneLinkRefusal; message?: string }

/** The number Firebase already has against this account, if any. */
export function linkedPhoneNumber(): string | null {
  return auth.currentUser?.phoneNumber ?? null
}

function refusalFor(error: unknown): PhoneLinkRefusal {
  const code = (error as { code?: string })?.code ?? ""
  if (code === "auth/provider-already-linked" || code === "auth/account-exists-with-different-credential") {
    return "phone_already_set"
  }
  if (code === "auth/credential-already-in-use" || code === "auth/phone-number-already-exists") {
    return "phone_taken"
  }
  if (code === "auth/invalid-verification-code") return "wrong_code"
  if (code === "auth/code-expired" || code === "auth/session-expired") return "code_expired"
  return "send_failed"
}

/**
 * Text a code to a number and hand back the way to spend it.
 *
 * Returns the confirm step as a closure rather than a verification id, because the id is
 * only ever used by the matching confirm and nothing else should be able to hold one.
 */
export async function startPhoneLink(msisdn: string, containerId: string): Promise<PhoneLinkStart> {
  const user = auth.currentUser
  if (!user) return { ok: false, reason: "not_signed_in" }

  // Checked before the SMS rather than after. Firebase would refuse the link anyway, but
  // only once the member had waited for a code they were never going to be able to use.
  const existing = user.phoneNumber
  if (existing && existing !== msisdn) {
    return { ok: false, reason: "phone_already_set", message: existing }
  }

  try {
    const { linkWithPhoneNumber } = await import("firebase/auth")
    const recaptcha = await createRecaptchaVerifier(containerId)
    const confirmation = await linkWithPhoneNumber(user, msisdn, recaptcha)

    return {
      ok: true,
      confirm: async (code: string) => {
        try {
          await confirmation.confirm(code)
          // The server reads the number off the auth record, and a stale token would make
          // it look as though nothing had happened.
          await user.getIdToken(true)
          return { ok: true }
        } catch (error) {
          return { ok: false, reason: refusalFor(error) }
        }
      },
    }
  } catch (error) {
    // reCAPTCHA is single-use once it has fired; a stale one makes every retry fail for a
    // reason that has nothing to do with the number.
    clearRecaptchaVerifier()
    return { ok: false, reason: refusalFor(error) }
  }
}

export { clearRecaptchaVerifier }
