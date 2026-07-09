import { useState } from "react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { AuthOnboardingLayout } from "@/components/auth/AuthOnboardingLayout"
import { JoinTypeCard } from "@/components/auth/JoinTypeCard"
import { Routes } from "@/routes/constants"

type JoinType = "individual" | "company" | ""

export default function JoinTypePage() {
  const navigate = useNavigate()
  const [joinType, setJoinType] = useState<JoinType>("")

  const continueFlow = () => {
    if (joinType === "individual") {
      navigate(Routes.auth.profession)
      return
    }

    if (joinType === "company") {
      navigate(Routes.app.agency.dashboard)
    }
  }

  return (
    <AuthOnboardingLayout showFooter={false}>
      <div className="mx-auto flex w-full max-w-[388px] flex-1 flex-col justify-center px-5 py-10 sm:px-0">
        <h1 className="mb-7 text-center text-[22px] font-normal leading-none">
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
          disabled={!joinType}
          onClick={continueFlow}
          className="mt-6 h-11 w-full bg-[#087fff] disabled:bg-[#e7eef0] disabled:text-white"
        >
          Continue
        </Button>
      </div>
    </AuthOnboardingLayout>
  )
}
