import { FormEvent, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { AuthOnboardingLayout } from "@/components/auth/AuthOnboardingLayout"
import { Routes } from "@/routes/constants"

export default function VerifyContactPage() {
  const navigate = useNavigate()
  const [digits, setDigits] = useState(["2", "0", "9", "9", "9"])
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  const updateDigit = (index: number, value: string) => {
    const nextValue = value.replace(/\D/g, "").slice(-1)
    setDigits((current) => current.map((digit, digitIndex) => (digitIndex === index ? nextValue : digit)))

    if (nextValue && index < digits.length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    navigate(Routes.auth.joinType)
  }

  return (
    <AuthOnboardingLayout>
      <div className="flex flex-col justify-center flex-1 w-full px-5 py-10 mx-auto max-w-123 sm:px-0">
        <h1 className="mb-10 text-[34px] font-normal leading-none">Verify your contact details</h1>

        <form onSubmit={handleSubmit}>
          <p className="mb-4 text-sm font-semibold">Check your email/ phone number for the one time PIN</p>
          <div className="grid grid-cols-5 gap-4 sm:gap-11">
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
          <Button type="submit" className="mt-6 h-11 w-full bg-[#087fff]">
            Verify and continue
          </Button>
        </form>

        <button type="button" className="mt-5 text-center text-sm font-medium text-[#087fff]">
          Resend code in 00:30
        </button>
      </div>
    </AuthOnboardingLayout>
  )
}
