import React, { useEffect, useState } from "react"
import { useNavigate, useSearchParams, Link } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ButtonLoader, PageLoader } from "@/components/ui/loader"
import { Routes } from "@/routes/constants"
import { verifyResetCode, confirmReset } from "@/utils/auth/services/authService"

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const oobCode = searchParams.get("oobCode") ?? ""
  const navigate = useNavigate()

  const [verifying, setVerifying] = useState(true)
  const [valid, setValid] = useState(false)
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!oobCode) {
      setVerifying(false)
      return
    }
    verifyResetCode(oobCode).then((result) => {
      setValid(result.success)
      if (!result.success) toast.error(result.error || "Invalid or expired reset link")
      setVerifying(false)
    })
  }, [oobCode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    setLoading(true)
    try {
      const result = await confirmReset(oobCode, password)
      if (!result.success) throw new Error(result.error)
      toast.success("Password updated. Please log in.")
      navigate(Routes.auth.login, { replace: true })
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return <PageLoader text="Verifying reset link..." />
  }

  if (!valid) {
    return (
      <div className="space-y-4 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Invalid link</h2>
        <p className="text-sm text-muted-foreground">This reset link is invalid or has expired.</p>
        <Link to={Routes.auth.forgotPassword} className="text-primary font-semibold hover:underline text-sm">
          Request a new link
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight">Set a new password</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <ButtonLoader />
              Updating...
            </span>
          ) : (
            "Update password"
          )}
        </Button>
      </form>
    </div>
  )
}
