import { useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ButtonLoader } from "@/components/ui/loader"
import { AuthOnboardingLayout } from "@/components/auth/AuthOnboardingLayout"
import { AuthStepHeader } from "@/components/auth/AuthStepHeader"
import { CertificationChip } from "@/components/auth/CertificationChip"
import { Routes } from "@/routes/constants"
import { useSignupWizard } from "@/utils/auth/context/SignupWizardContext"
import { updateCareConnectProfile } from "@/utils/auth/services/authService"
import { getAuthErrorMessage } from "@/utils/auth/helpers/errorMessages"

const certificationGroups = [
  {
    title: "Required Certifications",
    items: ["CPR", "BLS"],
  },
  {
    title: "Acute & Critical Care",
    items: ["ACLS", "PALS", "NRP", "TNCC", "ENPC", "CEN", "CCRN"],
  },
  {
    title: "Specialty Nursing",
    items: [
      "Wound Care Certification",
      "Hospice & Palliative Care Certification",
      "Oncology Nursing Certification",
      "Dialysis Certification",
      "Infection Prevention & Control",
      "IV Therapy Certification",
      "Case Management Certification",
      "Pain Management Certification",
      "Diabetes Management Certification",
    ],
  },
  {
    title: "Home Health & Community Care",
    items: [
      "Home Health Certification",
      "Dementia Care Training",
      "Alzheimer's Care Training",
      "Medication Administration Certification",
      "Care Coordination Certification",
      "Chronic Disease Management",
    ],
  },
  {
    title: "Behavioral & Mental Health",
    items: ["Psychiatric-Mental Health Nursing Certification", "Crisis Prevention Intervention (CPI)"],
  },
]

export default function CertificationsPage() {
  const navigate = useNavigate()
  const { setCertifications: setWizardCertifications } = useSignupWizard()
  const [selected, setSelected] = useState<string[]>(["CPR", "Wound Care Certification"])
  const [saving, setSaving] = useState(false)

  const toggleCertification = (label: string) => {
    setSelected((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label]
    )
  }

  const continueFlow = async () => {
    setSaving(true)
    try {
      await updateCareConnectProfile({ certifications: selected })
      setWizardCertifications(selected)
      navigate(Routes.auth.documents)
    } catch (error: unknown) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthOnboardingLayout showLogo={false} showFooter={false} className="min-h-0" header={<AuthStepHeader />}>
      <div className="flex min-h-0 flex-1 flex-col px-5 py-7 sm:px-10">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h1 className="text-[22px] font-normal leading-none">Which certifications do you currently hold?</h1>
          <span className="rounded-full border border-[#087fff] px-3 py-1 text-sm font-medium text-[#151922]">2 of 3</span>
        </div>

        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto pr-1">
          {certificationGroups.map((group) => (
            <section key={group.title}>
              <h2 className="mb-4 text-sm font-semibold text-[#353941]">{group.title}</h2>
              <div className="flex flex-wrap gap-3">
                {group.items.map((item) => (
                  <CertificationChip
                    key={item}
                    label={item}
                    selected={selected.includes(item)}
                    onClick={() => toggleCertification(item)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-6 mt-auto">
          <Button type="button" variant="outline" onClick={() => navigate(Routes.auth.profession)} className="h-11 rounded-md border-[#d9d9d9] hover:bg-[#2937ff4b] cursor-pointer">
            Go back
          </Button>
          <Button type="button" disabled={saving} onClick={() => void continueFlow()} className="h-11 rounded-md bg-[#087fff] px-6">
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <ButtonLoader />
                Saving...
              </span>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </div>
    </AuthOnboardingLayout>
  )
}
