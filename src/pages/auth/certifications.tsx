import { useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ButtonLoader } from "@/components/ui/loader"
import { Input } from "@/components/ui/input"
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
  const [customByGroup, setCustomByGroup] = useState<Record<string, string[]>>({})
  const [draftByGroup, setDraftByGroup] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const toggleCertification = (label: string) => {
    setSelected((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label]
    )
  }

  const addCustomCertification = (groupTitle: string) => {
    const value = (draftByGroup[groupTitle] ?? "").trim()
    if (!value) return
    setCustomByGroup((current) => ({
      ...current,
      [groupTitle]: current[groupTitle]?.includes(value) ? current[groupTitle] : [...(current[groupTitle] ?? []), value],
    }))
    setSelected((current) => (current.includes(value) ? current : [...current, value]))
    setDraftByGroup((current) => ({ ...current, [groupTitle]: "" }))
  }

  const continueFlow = async () => {
    setSaving(true)
    try {
      // NOTE: PR #60 (cb400a7) removed the certification upload this step used to do —
      // FileDropzone, `certificationFile`, and the uploadCareConnectDocument call were all
      // deleted a day after PR #58 added them. Left removed here rather than reinstated
      // unilaterally; if that deletion was unintended, restoring it belongs in its own change.
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
      <div className="flex flex-col flex-1 min-h-0 px-5 py-7 sm:px-10">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h1 className="text-[22px] font-normal leading-none">Which certifications do you currently hold?</h1>
          <span className="rounded-full border border-[#00b4b8] px-3 py-1 text-sm font-medium text-[#151922]">2 of 3</span>
        </div>

        <div className="flex-1 min-h-0 pr-1 space-y-8 overflow-y-auto">
          {certificationGroups.map((group) => {
            const customItems = customByGroup[group.title] ?? []
            return (
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
                  {customItems.map((item) => (
                    <CertificationChip
                      key={item}
                      label={item}
                      selected={selected.includes(item)}
                      onClick={() => toggleCertification(item)}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Input
                    value={draftByGroup[group.title] ?? ""}
                    onChange={(event) => setDraftByGroup((current) => ({ ...current, [group.title]: event.target.value }))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        addCustomCertification(group.title)
                      }
                    }}
                    placeholder={`Don't see it? Type another ${group.title.toLowerCase()} certification`}
                    className="h-10"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 shrink-0 border-[#00b4b8] text-[#00b4b8] hover:bg-[#e3f8f8]"
                    onClick={() => addCustomCertification(group.title)}
                  >
                    Add
                  </Button>
                </div>
              </section>
            )
          })}
        </div>

        <div className="flex justify-end gap-2 pt-6 mt-auto">
          <Button type="button" variant="outline" onClick={() => navigate(Routes.auth.profession)} className="h-11 rounded-md border-[#d9d9d9] hover:bg-[#00b4b84b] cursor-pointer">
            Go back
          </Button>
          <Button type="button" disabled={saving} onClick={() => void continueFlow()} className="h-11 rounded-md bg-[#00b4b8] px-6">
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
