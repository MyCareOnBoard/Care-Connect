import { FormEvent, useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AuthOnboardingLayout } from "@/components/auth/AuthOnboardingLayout"
import { AuthStepHeader } from "@/components/auth/AuthStepHeader"
import { Routes } from "@/routes/constants"
import { useSignupWizard } from "@/utils/auth/context/SignupWizardContext"
import { updateCareConnectProfile } from "@/utils/auth/services/authService"
import { getAuthErrorMessage } from "@/utils/auth/helpers/errorMessages"

export default function OrganizationNamePage() {
  const navigate = useNavigate()
  const { setOrganizationName: setWizardOrganizationName } = useSignupWizard()
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    try {
      await updateCareConnectProfile({ organizationName: name })
      setWizardOrganizationName(name)
      navigate(Routes.auth.organizationType)
    } catch (error: unknown) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthOnboardingLayout showLogo={false} showFooter={false} className="min-h-0" header={<AuthStepHeader />}>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 px-5 py-7 sm:px-10">
        <div className="flex flex-col items-center justify-center flex-1 gap-6 text-center">
          <h1 className="text-[22px] font-normal leading-none">What is the name of your organization</h1>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter the name here"
            className="max-w-md text-center"
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-6 mt-auto">
          <Button type="button" variant="outline" onClick={() => navigate(Routes.auth.joinType)} className="h-11 rounded-md border-[#d9d9d9] hover:bg-[#2937ff4b] cursor-pointer">
            Go back
          </Button>
          <Button type="submit" disabled={!name.trim() || saving} className="h-11 rounded-md bg-[#087fff] px-6 hover:bg-[#2937ff4b] cursor-pointer">
            {saving ? "Saving..." : "Continue"}
          </Button>
        </div>
      </form>
    </AuthOnboardingLayout>
  )
}
