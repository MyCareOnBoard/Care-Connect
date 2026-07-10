import { FormEvent, useState } from "react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { AuthOnboardingLayout } from "@/components/auth/AuthOnboardingLayout"
import { AuthStepHeader } from "@/components/auth/AuthStepHeader"
import { Routes } from "@/routes/constants"

const organizationTypes = [
  "Hospital",
  "Clinic",
  "Nursing Home",
  "Home Care Agency",
  "Pharmacy",
  "Assisted Living Facility",
  "Other",
]

export default function OrganizationTypePage() {
  const navigate = useNavigate()
  const [organizationType, setOrganizationType] = useState("")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    navigate(Routes.auth.organizationInterests)
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
          disabled={!organizationType}
          className="mx-auto mt-8 h-11 w-[92%] bg-[#087fff] disabled:bg-[#d5d5d5] disabled:text-white"
        >
          Continue
        </Button>
      </form>
    </AuthOnboardingLayout>
  )
}
