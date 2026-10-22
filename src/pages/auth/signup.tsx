import { FormEvent, useState } from "react"
import { Link, useNavigate } from "react-router"
import { Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ButtonLoader } from "@/components/ui/loader"
import { AuthOnboardingLayout } from "@/components/auth/AuthOnboardingLayout"
import { PhoneNumberField } from "@/components/auth/PhoneNumberField"
import { Routes } from "@/routes/constants"
import { getPasswordStrength } from "@/utils/passwordStrength"
import { useAuth } from "@/utils/auth"
import { useSignupWizard } from "@/utils/auth/context/SignupWizardContext"
import { createBackendUserProfile, deleteCurrentFirebaseUser } from "@/utils/auth/services/authService"
import { getAuthErrorMessage } from "@/utils/auth/helpers/errorMessages"
import { auth } from "@/lib/firebase"
import { recordAccountAgreement } from "@/lib/consent"

export default function SignUpPage() {
  const navigate = useNavigate()
  const { signup } = useAuth()
  const {
    fullName: wizardFullName,
    email: wizardEmail,
    phone: wizardPhone,
    isProfessional,
    setFullName: setWizardFullName,
    setEmail: setWizardEmail,
    setPhone: setWizardPhone,
  } = useSignupWizard()
  const [fullName, setFullName] = useState(wizardFullName)
  const [email, setEmail] = useState(wizardEmail)
  const [phone, setPhone] = useState(wizardPhone)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  // Terms and Privacy must be accepted to sign up; marketing is optional and starts unticked.
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [marketingEmail, setMarketingEmail] = useState(false)
  const [marketingSms, setMarketingSms] = useState(false)
  const passwordStrength = getPasswordStrength(password)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!acceptedTerms) {
      toast.error("Please accept the Terms of Service and Privacy Policy to continue.")
      return
    }
    setLoading(true)
    try {
      await signup(email, password, fullName)
      // What was agreed, against which policy version, and when — kept with the new account.
      const uid = auth.currentUser?.uid
      if (uid) {
        recordAccountAgreement(uid, {
          termsAcceptedAt: new Date().toISOString(),
          marketingEmail,
          marketingSms,
        })
      }
      setWizardFullName(fullName)
      setWizardEmail(email)
      setWizardPhone(phone)

      if (isProfessional) {
        // Invite-link signups skip join-type.tsx (there's no card to pick) — they're
        // always backend userType "careconnect_individual", same as the Individual branch.
        try {
          await createBackendUserProfile(fullName, "careconnect_individual")
          navigate(Routes.auth.verifyContact)
        } catch (error: unknown) {
          await deleteCurrentFirebaseUser().catch(() => undefined)
          toast.error(getAuthErrorMessage(error))
        }
        return
      }

      navigate(Routes.auth.joinType)
    } catch (error: unknown) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthOnboardingLayout>
      <div className="flex flex-col justify-center flex-1 w-full px-5 py-6 mx-auto max-w-123 sm:px-0">
        <h1 className="mb-6 text-[34px] font-normal leading-none">Create your account</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="font-semibold">
              Full name
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Enter your full name here"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="font-semibold">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email  here"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="font-semibold">
              Phone number
            </Label>
            <PhoneNumberField id="phone" value={phone} onChange={setPhone} required />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="font-semibold">
                Password
              </Label>
              <div className="flex items-center gap-2 text-sm text-[#565656]">
                <span>
                  Security level
                  {password && <span className="font-semibold" style={{ color: passwordStrength.color }}> · {passwordStrength.label}</span>}
                </span>
                {[0, 1, 2].map((bar) => (
                  <span
                    key={bar}
                    // The empty bars as a class, so dark mode can restyle them; the filled
                    // colour stays inline because it is the strength score's own colour.
                    className={`h-2 w-5 rounded-full transition-colors duration-200 ${passwordStrength.score > bar ? "" : "bg-[#e2e2e2]"}`}
                    style={passwordStrength.score > bar ? { backgroundColor: passwordStrength.color } : undefined}
                  />
                ))}
              </div>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password  here"
                required
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#737780] hover:text-[#151922]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </div>

          <fieldset className="space-y-3 rounded-2xl bg-[#f7fafb] p-4 ring-1 ring-[#eef1f3]">
            <legend className="sr-only">Agreements</legend>
            <label className="flex items-start gap-3 text-sm text-[#383d45]">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                required
                className="mt-0.5 size-4 shrink-0 accent-[#00b4b8]"
              />
              <span>
                I agree to the{" "}
                <Link to={Routes.legal.terms} target="_blank" className="font-semibold text-[#00868a] hover:underline">
                  Terms of Service
                </Link>{" "}
                and have read the{" "}
                <Link to={Routes.legal.privacy} target="_blank" className="font-semibold text-[#00868a] hover:underline">
                  Privacy Policy
                </Link>
                . <span className="text-[#b4372c]">*</span>
              </span>
            </label>
            <div className="border-t border-[#e8edef] pt-3">
              <p className="text-xs text-[#657080]">Optional — you can change these later in Settings.</p>
              <label className="mt-2 flex items-start gap-3 text-sm text-[#383d45]">
                <input
                  type="checkbox"
                  checked={marketingEmail}
                  onChange={(event) => setMarketingEmail(event.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-[#00b4b8]"
                />
                Send me news, tips and offers by email
              </label>
              <label className="mt-2 flex items-start gap-3 text-sm text-[#383d45]">
                <input
                  type="checkbox"
                  checked={marketingSms}
                  onChange={(event) => setMarketingSms(event.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-[#00b4b8]"
                />
                Send me offers by text message
              </label>
            </div>
          </fieldset>

          <Button type="submit" disabled={loading} className="mt-2 h-11 w-full text-white bg-[#00b4b8]">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <ButtonLoader />
                Creating account...
              </span>
            ) : (
              "Continue"
            )}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-[#00b4b8]">
          Already have an account?{" "}
          <Link to={Routes.auth.login} className="font-semibold hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </AuthOnboardingLayout>
  )
}
