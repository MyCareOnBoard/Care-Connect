import { useState } from "react"
import { toast } from "sonner"
import { Search, Heart, Bookmark, Link as LinkIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { SidePanel } from "@/components/app/SidePanel"
import { useDelayedLoading } from "@/hooks/useDelayedLoading"

type UserJob = {
  id: string
  title: string
  company: string
  location: string
  tags?: string[]
  description: string
}

const userJobs: UserJob[] = [
  {
    id: "u-job-1",
    title: "In Home Caregiver",
    company: "National senior home care",
    location: "4140 Parker Rd. Allentown, New Mexico 31134",
    description:
      "Join our compassionate team as an In Home Caregiver and make a meaningful difference in the lives of individuals needing support with daily activities and personal care. This energetic role offers the opportunity to provide personalized, respectful, and attentive care in clients' homes, promoting independence, safety, and well-being. As an In Home Caregiver, you will be a vital part of a dedicated team committed to enhancing quality of life through compassionate caregiving and professional support.\n\nResponsibilities\n- Assist clients with Activities of Daily Living (ADLs), including bathing, dressing, grooming, and mobility support\n- Monitor patients' health by observing vital signs, medication adherence, and overall condition, reporting any changes promptly\n- Prepare nutritious meals tailored to individual dietary needs and assist with meal planning and cooking\n- Support clients with mobility using equipment such as Hoyer lifts or wheelchairs, ensuring safety during transfers and movement\n- Maintain accurate care plans, document patient progress, and adhere to HIPAA regulations to protect client confidentiality\n- Perform light housekeeping duties including cleaning, laundry, and maintaining a safe living environment\n- Provide companionship and emotional support while engaging clients in social activities or recreational pursuits\n\nExperience\n- Prior experience working in home care, assisted living, nursing homes, or group homes is highly preferred\n- Demonstrated knowledge of patient observation techniques and vital signs monitoring\n- Experience assisting with ADLs and providing specialized care such as dementia, Alzheimer's, memory care or hospice care\n- Familiarity with working with individuals with developmental disabilities or autism spectrum disorder (ASD)\n- Certifications such as CPR, First Aid, HIPAA compliance training are advantageous\n- Hands-on experience with patient monitoring tools and mobility equipment like Hoyer lifts or resident lifts is a plus\n- Strong understanding of safety procedures including heavy lifting techniques and infection control practices\n\nJoin us to provide heartfelt care that truly makes a difference! We're dedicated to supporting your growth through ongoing training opportunities while fostering a positive environment where your compassion shines. All positions are paid roles committed to delivering high-quality home health services that respect the dignity and independence of every individual.",
  },
  {
    id: "u-job-2",
    title: "Synergy HomeCare has Caregiver Opportunities in Cherry Hill, Vorhees Township, Camden County",
    company: "SYNERGY HOMECARE",
    location: "4517 Washington Ave. Manchester, Kentucky 39495",
    description: "Join our compassionate team as an In Home Caregiver and make a meaningful difference in the lives of individuals needing support with daily activities and personal care.",
  },
  {
    id: "u-job-3",
    title: "Caregiver",
    company: "BREEZE OF CARE LLC",
    location: "1901 Thornridge Cir. Shiloh, Hawaii 81063",
    description: "Join our compassionate team as a Caregiver and make a meaningful difference in the lives of individuals needing support with daily activities and personal care.",
  },
  {
    id: "u-job-4",
    title: "Direct Support Professional",
    company: "Assurance care & support Inc",
    location: "Carneys point, NJ 08069",
    tags: ["401(K)", "Flexible schedule"],
    description: "Join our compassionate team as a Direct Support Professional and make a meaningful difference in the lives of individuals needing support with daily activities and personal care.",
  },
  {
    id: "u-job-5",
    title: "CNA / CHHA – In-Home Caregiver",
    company: "MATTISON SERVICES LLC",
    location: "8502 Preston Rd. Inglewood, Maine 98380",
    description: "Join our compassionate team as a CNA / CHHA and make a meaningful difference in the lives of individuals needing support with daily activities and personal care.",
  },
]

function QuickScreeningPanel({ open, onClose, onApply }: { open: boolean; onClose: () => void; onApply: () => void }) {
  const [relocate, setRelocate] = useState<"No" | "Yes">("No")
  const [certifications, setCertifications] = useState<"No" | "Yes">("No")
  const [availability, setAvailability] = useState("Immediately")
  const [why, setWhy] = useState("")

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Quick screening question"
      footer={
        <Button
          type="button"
          className="w-full bg-[#087fff]"
          onClick={() => {
            onApply()
            onClose()
          }}
        >
          Apply
        </Button>
      }
    >
      <div className="space-y-6">
        <div>
          <p className="mb-3 text-sm font-medium">Are you willing to relocate for the job</p>
          <div className="flex gap-6">
            {(["No", "Yes"] as const).map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm">
                <input type="radio" checked={relocate === option} onChange={() => setRelocate(option)} className="accent-[#087fff]" />
                {option}
              </label>
            ))}
          </div>
        </div>

        <div className="border-t border-[#eef1f3] pt-5">
          <p className="mb-3 text-sm font-medium">Are your required certifications up to date?</p>
          <div className="flex gap-6">
            {(["No", "Yes"] as const).map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm">
                <input type="radio" checked={certifications === option} onChange={() => setCertifications(option)} className="accent-[#087fff]" />
                {option}
              </label>
            ))}
          </div>
        </div>

        <div className="border-t border-[#eef1f3] pt-5">
          <p className="mb-3 text-sm font-medium">When are you available to start?</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {["Immediately", "Within 2 weeks", "Within 1 month", "More than 1 month"].map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm">
                <input type="radio" checked={availability === option} onChange={() => setAvailability(option)} className="accent-[#087fff]" />
                {option}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2 border-t border-[#eef1f3] pt-5">
          <label className="text-sm font-medium">Why are you interested in this opportunity?</label>
          <Textarea value={why} onChange={(event) => setWhy(event.target.value)} className="min-h-30" />
        </div>
      </div>
    </SidePanel>
  )
}

function JobsSkeleton() {
  return (
    <div className="p-5 space-y-6 sm:p-8">
      <Skeleton className="h-10 w-60" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </div>
  )
}

export default function UserJobsPage() {
  const isLoading = useDelayedLoading()
  const [selectedJobId, setSelectedJobId] = useState(userJobs[0].id)
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set())
  const [isApplyOpen, setIsApplyOpen] = useState(false)

  if (isLoading) return <JobsSkeleton />

  const selectedJob = userJobs.find((job) => job.id === selectedJobId) ?? userJobs[0]

  const toggleSaved = (id: string) => {
    setSavedJobIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="animate-fade-in-up grid gap-5 p-5 sm:p-8 xl:grid-cols-[380px_minmax(0,1fr)]">
      <aside className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]" />
          <Input placeholder="Job title, keywords, or company" className="pl-9" />
        </div>

        <div className="space-y-3">
          {userJobs.map((job) => (
            <article
              key={job.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedJobId(job.id)}
              onKeyDown={(event) => event.key === "Enter" && setSelectedJobId(job.id)}
              className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                job.id === selectedJobId ? "border-[#087fff] bg-[#eaf4ff]" : "border-[#e2e2e2] bg-white hover:border-[#087fff]/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-bold leading-snug">{job.title}</h3>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    toggleSaved(job.id)
                  }}
                  aria-label={savedJobIds.has(job.id) ? "Unsave job" : "Save job"}
                  className="shrink-0"
                >
                  <Heart className={`size-5 transition-colors ${savedJobIds.has(job.id) ? "fill-[#ff3e66] text-[#ff3e66]" : "text-[#20242c]"}`} />
                </button>
              </div>
              <p className="mt-2 text-sm text-[#565656]">{job.company}</p>
              <p className="mt-1 text-sm text-[#565656]">{job.location}</p>
              {job.tags && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {job.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-[#dddddd] px-3 py-1 text-xs font-semibold text-[#20242c]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </aside>

      <main className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{selectedJob.title}</h1>
            <p className="mt-1 flex items-center gap-1 text-sm text-[#565656]">
              {selectedJob.company}
              <LinkIcon className="size-3.5" />
            </p>
            <p className="mt-1 text-sm text-[#565656]">{selectedJob.location}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-[#ffc95c] text-sm font-bold text-white">JB</span>
          <div>
            <p className="text-sm font-bold">Jerome Bell</p>
            <p className="text-sm text-[#657080]">Job Hirer</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            className="bg-[#087fff]"
            disabled={appliedJobIds.has(selectedJob.id)}
            onClick={() => setIsApplyOpen(true)}
          >
            {appliedJobIds.has(selectedJob.id) ? "Applied" : "Apply here"}
          </Button>
          <button
            type="button"
            onClick={() => toggleSaved(selectedJob.id)}
            aria-label="Save job"
            className="flex size-11 items-center justify-center rounded-full border border-[#e2e2e2] transition hover:bg-[#f2f6f8]"
          >
            <Heart className={`size-4 transition-colors ${savedJobIds.has(selectedJob.id) ? "fill-[#ff3e66] text-[#ff3e66]" : ""}`} />
          </button>
          <button
            type="button"
            aria-label="Bookmark job"
            className="flex size-11 items-center justify-center rounded-full border border-[#e2e2e2] transition hover:bg-[#f2f6f8]"
          >
            <Bookmark className="size-4" />
          </button>
        </div>

        <div className="border-t border-[#eef1f3] pt-5">
          <h2 className="text-lg font-bold">Job details</h2>
          <p className="mt-1 text-sm text-[#657080]">Here&apos;s how the job details align with your profile.</p>
          <div className="mt-4 whitespace-pre-line rounded-xl bg-[#f7f9fa] p-5 text-sm leading-6 text-[#20242c]">
            {selectedJob.description}
          </div>
        </div>
      </main>

      <QuickScreeningPanel
        open={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        onApply={() => {
          toast.success("Application submitted!")
          setAppliedJobIds((current) => new Set(current).add(selectedJob.id))
        }}
      />
    </div>
  )
}
