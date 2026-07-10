import React, { useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/utils/auth"
import { ButtonLoader } from "@/components/ui/loader"
import { Routes } from "@/routes/constants"
import { getAuthErrorMessage } from "@/utils/auth/helpers/errorMessages"
import { AuthOnboardingLayout } from "@/components/auth/AuthOnboardingLayout"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (error: unknown) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthOnboardingLayout>
        <div className="flex flex-col justify-center flex-1 w-full px-5 py-10 mx-auto text-center max-w-123 sm:px-0">
          <h1 className="text-[34px] font-normal leading-none">Check your email</h1>
          <p className="mt-4 text-sm text-[#565656]">
            We&apos;ve sent password reset instructions to {email}.
          </p>
          <Link to={Routes.auth.login} className="mt-7 text-sm font-semibold text-[#087fff] hover:underline">
            Back to login
          </Link>
        </div>
      </AuthOnboardingLayout>
    )
  }

  return (
    <AuthOnboardingLayout>
      <div className="flex flex-col justify-center flex-1 w-full px-5 py-10 mx-auto max-w-123 sm:px-0">
        <div className="text-center mb-9">
          <h1 className="text-[34px] font-normal leading-none">Forgot password?</h1>
          <p className="mt-4 text-sm text-[#565656]">Enter your email and we&apos;ll send you a reset link</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="font-semibold">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email here"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="h-11 w-full bg-[#087fff]">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <ButtonLoader />
                Sending...
              </span>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>

        <p className="text-sm text-center mt-7">
          <Link to={Routes.auth.login} className="font-semibold text-[#087fff] hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </AuthOnboardingLayout>
  )
}
