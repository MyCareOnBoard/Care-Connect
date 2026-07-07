import React, { useState } from "react"
import { useNavigate, Link } from "react-router"
import { Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/utils/auth"
import { ButtonLoader } from "@/components/ui/loader"
import { Routes } from "@/routes/constants"
import { getAuthErrorMessage, getValidationMessage } from "@/utils/auth/helpers/errorMessages"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  const { login } = useAuth()
  const navigate = useNavigate()

  const validateEmail = (value: string) => {
    if (!value) return getValidationMessage('email', 'required')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return getValidationMessage('email', 'invalid')
    return ""
  }

  const validatePassword = (value: string) => {
    if (!value) return getValidationMessage('password', 'required')
    if (value.length < 6) return getValidationMessage('password', 'tooShort')
    return ""
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)

    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError })
      toast.error(getValidationMessage('form', 'invalid'))
      return
    }

    setLoading(true)
    try {
      await login(email, password)
      navigate(Routes.app.dashboard, { replace: true })
    } catch (error: unknown) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight">Login to your account</h2>
        <p className="text-sm text-muted-foreground">Please enter your information to access your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })) }}
            onBlur={() => setErrors((p) => ({ ...p, email: validateEmail(email) }))}
            aria-invalid={!!errors.email}
            required
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: "" })) }}
              onBlur={() => setErrors((p) => ({ ...p, password: validatePassword(password) }))}
              aria-invalid={!!errors.password}
              required
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
        </div>

        <div className="flex justify-end">
          <Link to={Routes.auth.forgotPassword} className="text-sm text-primary font-semibold hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <ButtonLoader />
              Logging in...
            </span>
          ) : (
            "Login"
          )}
        </Button>
      </form>

      <p className="text-sm text-center text-muted-foreground">
        Don't have an account?{" "}
        <Link to={Routes.auth.signup} className="text-primary font-semibold hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}
