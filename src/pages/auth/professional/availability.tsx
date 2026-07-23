import { useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ButtonLoader } from "@/components/ui/loader"
import { AuthOnboardingLayout } from "@/components/auth/AuthOnboardingLayout"
import { AuthStepHeader } from "@/components/auth/AuthStepHeader"
import { AvailabilityEditor } from "@/components/professional/AvailabilityEditor"
import { Routes } from "@/routes/constants"
import { useAuthUser } from "@/utils/auth"
import { completeOnboarding } from "@/utils/auth/services/authService"
import { getAuthErrorMessage } from "@/utils/auth/helpers/errorMessages"
import { DEFAULT_AVAILABILITY, saveAvailability, type WeeklyAvailability } from "@/utils/professional/availabilityStore"
import { markProfessionalAccount } from "@/utils/professional/professionalAccount"

export default function ProfessionalAvailabilityPage() {
  const navigate = useNavigate()
  const { user } = useAuthUser()
  const [availability, setAvailability] = useState<WeeklyAvailability>(DEFAULT_AVAILABILITY)
  const [finishing, setFinishing] = useState(false)

  const finishSetup = async () => {
    setFinishing(true)
    try {
      await completeOnboarding()
      if (user?.uid) {
        markProfessionalAccount(user.uid)
        saveAvailability(user.uid, availability)
      }
      navigate(Routes.auth.welcome)
    } catch (error: unknown) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setFinishing(false)
    }
  }

  return (
    <AuthOnboardingLayout showLogo={false} showFooter={false} className="min-h-0" header={<AuthStepHeader />}>
      <div className="flex flex-col flex-1 min-h-0 px-5 py-7 sm:px-10">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h1 className="text-[22px] font-semibold leading-none">One more thing!</h1>
          <span className="rounded-full border border-[#087fff] px-3 py-1 text-sm font-medium text-[#151922]">4 of 4</span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-[#eef1f3] px-5 py-4">
          <h2 className="text-lg font-semibold text-[#151922]">Availability</h2>
          <p className="mt-1 text-sm text-[#657080]">
            Set up your availability to streamline your schedule and enhance your business efficiency!
          </p>
          <AvailabilityEditor value={availability} onChange={setAvailability} />
        </div>

        <div className="flex justify-end gap-2 pt-6 mt-auto">
          <Button type="button" variant="outline" onClick={() => navigate(Routes.auth.documents)} className="h-11 rounded-md border-[#d9d9d9] hover:bg-[#2937ff4b] cursor-pointer">
            Go back
          </Button>
          <Button type="button" disabled={finishing} onClick={() => void finishSetup()} className="h-11 rounded-md bg-[#087fff] px-6">
            {finishing ? (
              <span className="flex items-center justify-center gap-2">
                <ButtonLoader />
                Finishing up...
              </span>
            ) : (
              "Finish set up"
            )}
          </Button>
        </div>
      </div>
    </AuthOnboardingLayout>
  )
}
