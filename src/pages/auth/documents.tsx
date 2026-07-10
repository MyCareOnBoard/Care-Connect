import { useState } from "react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { AuthOnboardingLayout } from "@/components/auth/AuthOnboardingLayout"
import { AuthStepHeader } from "@/components/auth/AuthStepHeader"
import { FileDropzone } from "@/components/auth/FileDropzone"
import { Routes } from "@/routes/constants"

export default function DocumentsPage() {
  const navigate = useNavigate()
  const [cv, setCv] = useState<File | null>(null)
  const [coverLetter, setCoverLetter] = useState<File | null>(null)

  return (
    <AuthOnboardingLayout showLogo={false} showFooter={false} className="min-h-0" header={<AuthStepHeader />}>
      <div className="flex flex-col flex-1 min-h-0 px-5 py-7 sm:px-10">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h1 className="text-[22px] font-semibold leading-none">One more thing!</h1>
          <span className="rounded-full border border-[#087fff] px-3 py-1 text-sm font-medium text-[#151922]">3 of 3</span>
        </div>

        <div className="flex-1 min-h-0 pr-1 space-y-2 overflow-y-auto">
          <div className="rounded-t-lg bg-[#f4f4f5] px-4 py-3 text-sm">
            <h2 className="font-semibold text-center">Upload your CV here</h2>
          </div>
          <FileDropzone file={cv} onFileChange={setCv} />
          <div className="rounded-t-lg bg-[#f4f4f5d7] px-4 py-3 text-sm">
            <h2 className="font-semibold text-center">Upload your Cover letter here</h2>
          </div>
          <FileDropzone file={coverLetter} onFileChange={setCoverLetter} />
        </div>

        <div className="flex justify-end gap-2 pt-6 mt-auto">
          <Button type="button" variant="outline" onClick={() => navigate(Routes.auth.certifications)} className="h-11 rounded-md border-[#d9d9d9] hover:bg-[#2937ff4b] cursor-pointer">
            Go back
          </Button>
          <Button type="button" onClick={() => navigate(Routes.auth.welcome)} className="h-11 rounded-md bg-[#087fff] px-6">
            Finish set up
          </Button>
        </div>
      </div>
    </AuthOnboardingLayout>
  )
}
