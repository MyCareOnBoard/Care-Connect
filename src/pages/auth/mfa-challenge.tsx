import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { useNavigate } from "react-router"
import { useDispatch } from "react-redux"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ButtonLoader } from "@/components/ui/loader"
import { AuthOnboardingLayout } from "@/components/auth/AuthOnboardingLayout"
import { RecaptchaAnchor } from "@/components/auth/RecaptchaAnchor"
import { Routes } from "@/routes/constants"
import { useAuth } from "@/utils/auth"
import { getAuthErrorMessage } from "@/utils/auth/helpers/errorMessages"
import { completePostLogin } from "@/utils/auth/helpers/postLogin"
import {
  clearRecaptchaVerifier,
  completeMfaSignIn,
  createRecaptchaVerifier,
  startMfaSignInChallenge,
} from "@/utils/auth/services/mfaService"
import {
  clearMfaResolverSession,
  getMfaResolverSession,
} from "@/utils/auth/services/mfaSessionStore"
import type { AppDispatch } from "@/store/redux/store"

const RECAPTCHA_CONTAINER_ID = "recaptcha-mfa-challenge"
const CODE_LENGTH = 6
const RESEND_COOLDOWN_SEC = 60

type ChallengePhase = "sending" | "enter-code" | "send-failed"

export default function MfaChallengePage() {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { logout } = useAuth()

  const [verificationId, setVerificationId] = useState<string | null>(null)
  const [phase, setPhase] = useState<ChallengePhase>("sending")
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""))
  const [resendSeconds, setResendSeconds] = useState(0)
  const [maskedPhone, setMaskedPhone] = useState("your phone")
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const autoSendStarted = useRef(false)
  const completedRef = useRef(false)

  const mfaSession = getMfaResolverSession()

  useEffect(() => {
    if (mfaSession) {
      setMaskedPhone(mfaSession.maskedPhone)
      return () => clearRecaptchaVerifier()
    }

    if (!completedRef.current) {
      toast.error("Sign-in timed out. Please log in again.")
      navigate(Routes.auth.login, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sendCode = useCallback(async () => {
    const session = getMfaResolverSession()
    if (!session) {
      setPhase("send-failed")
      return
    }
    setSending(true)
    setPhase("sending")
    try {
      const recaptcha = await createRecaptchaVerifier(RECAPTCHA_CONTAINER_ID)
      const id = await startMfaSignInChallenge(session.resolver, recaptcha)
      setVerificationId(id)
      setDigits(Array(CODE_LENGTH).fill(""))
      setResendSeconds(RESEND_COOLDOWN_SEC)
      setPhase("enter-code")
    } catch (error: unknown) {
      toast.error(getAuthErrorMessage(error))
      setPhase("send-failed")
    } finally {
      setSending(false)
    }
  }, [])

  useEffect(() => {
    if (!mfaSession || autoSendStarted.current) return
    autoSendStarted.current = true
    void sendCode()
  }, [mfaSession, sendCode])

  useEffect(() => {
    if (resendSeconds <= 0) return
    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resendSeconds])

  const updateDigit = (index: number, value: string) => {
    const nextValue = value.replace(/\D/g, "").slice(-1)
    setDigits((current) => current.map((digit, digitIndex) => (digitIndex === index ? nextValue : digit)))

    if (nextValue && index < digits.length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const session = getMfaResolverSession()
    const code = digits.join("")
    if (!session || !verificationId || code.length < CODE_LENGTH) return

    completedRef.current = true
    setVerifying(true)
    try {
      await completeMfaSignIn(session.resolver, verificationId, code)
      clearMfaResolverSession()
      await completePostLogin(dispatch, navigate)
    } catch (error: unknown) {
      completedRef.current = false
      toast.error(getAuthErrorMessage(error))
    } finally {
      setVerifying(false)
    }
  }

  const handleDifferentAccount = async () => {
    clearMfaResolverSession()
    clearRecaptchaVerifier()
    await logout()
    navigate(Routes.auth.login, { replace: true })
  }

  if (!mfaSession) {
    return null
  }

  return (
    <AuthOnboardingLayout>
      <div className="flex flex-col justify-center flex-1 w-full px-5 py-10 mx-auto max-w-123 sm:px-0">
        <h1 className="mb-4 text-[34px] font-normal leading-none">Verify it&apos;s you</h1>
        <p className="mb-8 text-sm text-[#565656]">
          {phase === "enter-code"
            ? `Enter the code we sent to ${maskedPhone}`
            : phase === "send-failed"
              ? "We couldn't send a verification code."
              : `Sending a code to ${maskedPhone}...`}
        </p>

        <RecaptchaAnchor id={RECAPTCHA_CONTAINER_ID} />

        {phase === "send-failed" && (
          <Button
            type="button"
            onClick={() => void sendCode()}
            disabled={sending}
            className="h-11 w-full bg-[#087fff]"
          >
            {sending ? (
              <span className="flex items-center justify-center gap-2">
                <ButtonLoader />
                Sending...
              </span>
            ) : (
              "Send code"
            )}
          </Button>
        )}

        {phase === "enter-code" && (
          <form onSubmit={handleVerify}>
            <div className="grid grid-cols-6 gap-2 sm:gap-4">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(node) => {
                    inputRefs.current[index] = node
                  }}
                  value={digit}
                  onChange={(event) => updateDigit(index, event.target.value)}
                  className="h-15.5 rounded-xl border border-[#d7d7d8] text-center text-3xl font-bold outline-none focus:border-[#087fff] focus:ring-2 focus:ring-[#087fff]/20"
                  inputMode="numeric"
                  aria-label={`Verification digit ${index + 1}`}
                  required
                />
              ))}
            </div>

            <Button type="submit" disabled={verifying} className="mt-6 h-11 w-full bg-[#087fff]">
              {verifying ? (
                <span className="flex items-center justify-center gap-2">
                  <ButtonLoader />
                  Verifying...
                </span>
              ) : (
                "Verify and continue"
              )}
            </Button>

            <button
              type="button"
              disabled={resendSeconds > 0 || sending}
              onClick={() => void sendCode()}
              className="mt-5 w-full text-center text-sm font-medium text-[#087fff] disabled:text-[#a3c9f0]"
            >
              {sending
                ? "Resending..."
                : resendSeconds > 0
                  ? `Resend code in 00:${resendSeconds.toString().padStart(2, "0")}`
                  : "Resend code"}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => void handleDifferentAccount()}
          className="mt-6 text-center text-sm text-[#657080] hover:underline"
        >
          Use a different account
        </button>
      </div>
    </AuthOnboardingLayout>
  )
}
