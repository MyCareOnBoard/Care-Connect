import { FormEvent, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ButtonLoader } from "@/components/ui/loader"
import { AuthOnboardingLayout } from "@/components/auth/AuthOnboardingLayout"
import { Routes } from "@/routes/constants"
import { useSignupWizard } from "@/utils/auth/context/SignupWizardContext"
import { getOtpStatus, resendOtp, sendOtp, verifyOtp } from "@/utils/auth/services/authService"
import { getAuthErrorMessage } from "@/utils/auth/helpers/errorMessages"

const CODE_LENGTH = 6
const RESEND_COOLDOWN_SEC = 30

export default function VerifyContactPage() {
  const navigate = useNavigate()
  const { joinType } = useSignupWizard()
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""))
  const [verifying, setVerifying] = useState(false)
  const [sending, setSending] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(RESEND_COOLDOWN_SEC)
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const initialSendStarted = useRef(false)

  const goToNextStep = () => {
    navigate(joinType === "company" ? Routes.auth.organizationName : Routes.auth.profession)
  }

  useEffect(() => {
    if (initialSendStarted.current) return
    initialSendStarted.current = true

    const init = async () => {
      try {
        const alreadyVerified = await getOtpStatus()
        if (alreadyVerified) {
          goToNextStep()
          return
        }
        await sendOtp()
      } catch (error: unknown) {
        toast.error(getAuthErrorMessage(error))
      }
    }
    void init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const otp = digits.join("")
    if (otp.length < CODE_LENGTH) return

    setVerifying(true)
    try {
      await verifyOtp(otp)
      goToNextStep()
    } catch (error: unknown) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = async () => {
    if (resendSeconds > 0 || sending) return
    setSending(true)
    try {
      await resendOtp()
      setResendSeconds(RESEND_COOLDOWN_SEC)
      setDigits(Array(CODE_LENGTH).fill(""))
      inputRefs.current[0]?.focus()
    } catch (error: unknown) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSending(false)
    }
  }

  return (
    <AuthOnboardingLayout>
      <div className="flex flex-col justify-center flex-1 w-full px-5 py-10 mx-auto max-w-123 sm:px-0">
        <h1 className="mb-10 text-[34px] font-normal leading-none">Verify your contact details</h1>

        <form onSubmit={handleSubmit}>
          <p className="mb-4 text-sm font-semibold">Check your email for the one time PIN</p>
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
        </form>

        <button
          type="button"
          disabled={resendSeconds > 0 || sending}
          onClick={() => void handleResend()}
          className="mt-5 text-center text-sm font-medium text-[#087fff] disabled:text-[#a3c9f0]"
        >
          {sending
            ? "Resending..."
            : resendSeconds > 0
              ? `Resend code in 00:${resendSeconds.toString().padStart(2, "0")}`
              : "Resend code"}
        </button>
      </div>
    </AuthOnboardingLayout>
  )
}
