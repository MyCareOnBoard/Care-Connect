import { FormEvent, useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { AuthOnboardingLayout } from "@/components/auth/AuthOnboardingLayout"
import { AuthStepHeader } from "@/components/auth/AuthStepHeader"
import { Routes } from "@/routes/constants"
import { useSignupWizard } from "@/utils/auth/context/SignupWizardContext"
import { useAuthUser } from "@/utils/auth"
import { updateCareConnectProfile } from "@/utils/auth/services/authService"
import { getAuthErrorMessage } from "@/utils/auth/helpers/errorMessages"
import type { UserProfile } from "@/utils/auth/types/user.types"

const organizationTypes = [
  "Hospital",
  "Clinic",
  "Nursing Home",
  "Home Care Agency",
  "Pharmacy",
  "Assisted Living Facility",
  "Other",
]

/**
 * Best-guess organization type for an existing Care-On-Board agency logging into CareConnect.
 * `agencyType` is free-text so it rarely matches the dropdown; fall back to the enforced
 * `supportedClientTypes` classification. Every Care-On-Board agency is a home-care/DDD
 * provider, so a known agency defaults to "Home Care Agency". Returns "" when there's no
 * agency data (e.g. a native CareConnect company signup), leaving the field for the user.
 */
function deriveOrganizationType(profile: UserProfile | null | undefined): string {
  if (profile?.agencyType && organizationTypes.includes(profile.agencyType)) {
    return profile.agencyType
  }
  return profile?.supportedClientTypes?.length ? "Home Care Agency" : ""
}

export default function OrganizationTypePage() {
  const navigate = useNavigate()
  const { organizationType: wizardOrganizationType, setOrganizationType: setWizardOrganizationType } = useSignupWizard()
  const { user } = useAuthUser()
  const [organizationType, setOrganizationType] = useState(
    wizardOrganizationType || deriveOrganizationType(user?.profile)
  )
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    try {
      await updateCareConnectProfile({ organizationType })
      setWizardOrganizationType(organizationType)
      navigate(Routes.auth.organizationInterests)
    } catch (error: unknown) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthOnboardingLayout showLogo={false} showFooter={false} className="min-h-0" header={<AuthStepHeader />}>
      <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-111.5 flex-1 flex-col justify-center px-5 py-10 sm:px-0">
        <h1 className="mb-5 text-center text-[22px] font-normal leading-none">What type of organization are you?</h1>

        <select
          value={organizationType}
          onChange={(event) => setOrganizationType(event.target.value)}
          className="h-11 w-full rounded-md pr-6 border border-[#e2e2e2] bg-white px-4 text-sm text-[#151922] outline-none focus:border-[#087fff] focus:ring-2 focus:ring-[#087fff]/20 cursor-pointer"
          required
        >
          <option value="">-- Select your organization type here --</option>
          {organizationTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <Button
          type="submit"
          disabled={!organizationType || saving}
          className="mx-auto mt-8 h-11 w-[92%] bg-[#087fff] disabled:bg-[#d5d5d5] disabled:text-white"
        >
          {saving ? "Saving..." : "Continue"}
        </Button>
      </form>
    </AuthOnboardingLayout>
  )
}
