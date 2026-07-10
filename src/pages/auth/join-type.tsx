import { useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ButtonLoader } from "@/components/ui/loader"
import { AuthOnboardingLayout } from "@/components/auth/AuthOnboardingLayout"
import { JoinTypeCard } from "@/components/auth/JoinTypeCard"
import { Routes } from "@/routes/constants"
import { useSignupWizard } from "@/utils/auth/context/SignupWizardContext"
import { createBackendUserProfile, deleteCurrentFirebaseUser } from "@/utils/auth/services/authService"
import { getAuthErrorMessage } from "@/utils/auth/helpers/errorMessages"

export default function JoinTypePage() {
  const navigate = useNavigate()
  const { fullName, joinType, setJoinType } = useSignupWizard()
  const [submitting, setSubmitting] = useState(false)

  const continueFlow = async () => {
    if (!joinType) return
    setSubmitting(true)
    try {
      const userType = joinType === "company" ? "careconnect_company" : "careconnect_individual"
      await createBackendUserProfile(fullName, userType)
      navigate(Routes.auth.verifyContact)
    } catch (error: unknown) {
      await deleteCurrentFirebaseUser().catch(() => undefined)
      toast.error(getAuthErrorMessage(error))
      navigate(Routes.auth.signup)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthOnboardingLayout showFooter={false}>
      <div className="flex flex-col justify-center flex-1 w-full px-5 py-10 mx-auto max-w-97 sm:px-0">
        <h1 className="mb-7 text-center text-[20px] font-medium leading-none text-[#151922]">
          How would you like to join CareConnect?
        </h1>
        <div className="space-y-3.5">
          <JoinTypeCard
            title="Individual"
            description="Create a professional profile, apply for jobs, connect with employers, and grow your healthcare career."
            selected={joinType === "individual"}
            onClick={() => setJoinType("individual")}
          />
          <JoinTypeCard
            title="Company"
            description="Recruit healthcare professionals, post job openings, manage your organization, and promote your services or products."
            selected={joinType === "company"}
            onClick={() => setJoinType("company")}
          />
        </div>

        <Button
          type="button"
          disabled={!joinType || submitting}
          onClick={() => void continueFlow()}
          className="mt-6 h-11 w-full bg-[#087fff] disabled:bg-[#e7eef0] disabled:text-white"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <ButtonLoader />
              Continuing...
            </span>
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </AuthOnboardingLayout>
  )
}
