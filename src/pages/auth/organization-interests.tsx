import { useState } from "react"
import { useNavigate } from "react-router"
import { Check, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthOnboardingLayout } from "@/components/auth/AuthOnboardingLayout"
import { AuthStepHeader } from "@/components/auth/AuthStepHeader"
import { Routes } from "@/routes/constants"

const interestOptions = [
  "Hire healthcare professionals",
  "Search for talent",
  "Post job vacancies",
  "Sell medical equipment",
  "Offer healthcare services",
  "Buy medical equipment",
  "Connect with providers",
  "Build professional partnerships",
]

function InterestTag({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        selected ? "border-[#087fff] bg-white text-[#087fff]" : "border-[#e2e2e2] text-[#141922] hover:border-[#087fff]"
      }`}
    >
      {label}
      {selected ? <Check className="size-4" /> : <Plus className="size-4" />}
    </button>
  )
}

export default function OrganizationInterestsPage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string[]>([])

  const toggleInterest = (label: string) => {
    setSelected((current) => (current.includes(label) ? current.filter((item) => item !== label) : [...current, label]))
  }

  return (
    <AuthOnboardingLayout showLogo={false} showFooter={false} className="min-h-0" header={<AuthStepHeader />}>
      <div className="flex min-h-0 flex-1 flex-col px-5 py-7 sm:px-10">
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <div className="flex w-full items-center justify-center gap-4">
            <h1 className="text-[22px] font-normal leading-none">What would you like to do on CareConnect?</h1>
            <span className="rounded-full border border-[#087fff] px-3 py-1 text-sm font-medium text-[#151922]">3 of 3</span>
          </div>
          <p className="mb-4 text-sm text-[#657080]">Select all if they apply</p>

          <div className="flex max-w-2xl flex-wrap justify-center gap-3">
            {interestOptions.map((option) => (
              <InterestTag key={option} label={option} selected={selected.includes(option)} onClick={() => toggleInterest(option)} />
            ))}
          </div>
        </div>

        <div className="mt-auto flex justify-end gap-2 pt-6">
          <Button type="button" variant="outline" onClick={() => navigate(Routes.auth.organizationType)} className="h-11 rounded-md border-[#d9d9d9] hover:bg-[#2937ff4b] cursor-pointer">
            Go back
          </Button>
          <Button
            type="button"
            disabled={selected.length === 0}
            onClick={() => navigate(Routes.app.agency.dashboard)}
            className="h-11 rounded-md bg-[#087fff] px-6 hover:bg-[#2937ff4b] cursor-pointer"
          >
            Continue
          </Button>
        </div>
      </div>
    </AuthOnboardingLayout>
  )
}
