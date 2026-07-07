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
      <div className="space-y-4 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          We've sent password reset instructions to {email}.
        </p>
        <Link to={Routes.auth.login} className="text-primary font-semibold hover:underline text-sm">
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight">Forgot password?</h2>
        <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <Button type="submit" disabled={loading} className="w-full">
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

      <p className="text-sm text-center text-muted-foreground">
        <Link to={Routes.auth.login} className="text-primary font-semibold hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  )
}
