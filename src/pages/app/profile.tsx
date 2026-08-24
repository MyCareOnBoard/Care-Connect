import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { useNavigate } from "react-router"
import { Banknote, Briefcase, Camera, Mail, MapPin, Paperclip, Pencil, Phone, UserPlus, UserRound, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ProfileModals } from "@/components/profile/ProfileModals"
import { PortfolioPost, type PostComment } from "@/components/profile/PortfolioPost"
import { PostComposer } from "@/components/app/PostComposer"
import { toPortfolioData } from "@/components/profile/postMapping"
import { useCareFlow } from "@/components/app/useCareFlow"
import { Routes } from "@/routes/constants"
import { toast } from "sonner"
import { getInitials } from "@/lib/utils"
import { getAuthErrorMessage, useAuthUser } from "@/utils/auth"
import { updateUserProfile, updateCareConnectProfile } from "@/utils/auth/services/authService"
import { useAccountSettings } from "@/hooks/useAccountSettings"
import { certificationStatus, formatCertificationPeriod } from "@/components/profile/certifications"
import { getProfile, uploadProfileImage } from "@/utils/careconnect/services/profilesService"
import {
  addComment,
  deletePost,
  likePost,
  listComments,
  listFeed,
  unlikePost,
  POST_CREATED_EVENT,
  type FeedPost,
} from "@/utils/careconnect/services/postsService"
import { listMyJobs } from "@/utils/careconnect/services/jobsService"
import {
  bulkInviteTeamMembers,
  inviteTeamMember,
  listMyTeam,
  removeTeamMember,
  type BulkInviteMemberInput,
  type BulkInviteResult,
} from "@/utils/careconnect/services/teamService"
import {
  EMPLOYMENT_TYPE_LABELS,
  formatRelative,
  formatSalary,
  type CareConnectProfile,
  type Job,
  type ProfileCertification,
  type ProfileExperience,
  type TeamMember,
} from "@/utils/careconnect/types"

const defaultSummary = {
  name: "",
  headline: "",
  location: "",
  email: "",
  phone: "",
  metrics: [
    { label: "Connections", value: "0" },
    { label: "Profile views", value: "0" },
    { label: "Application views", value: "0" },
  ],
}

const defaultAgencySummary = {
  name: "",
  headline: "",
  location: "",
  email: "",
  phone: "",
  metrics: [
    { label: "Connections", value: "0" },
    { label: "Profile views", value: "0" },
    { label: "Jobs posted", value: "0" },
  ],
}

type AgencyPostedJob = {
  id: string
  title: string
  status: string
  type: string
  location: string
  pay?: string
  applicants: number
  postedAgo: string
}

const AGENCY_STATUS_LABEL: Record<string, string> = { open: "Active", closed: "Closed", draft: "Draft" }

/** Map a backend job into the presentational posted-job shape. */
function toPostedJob(job: Job): AgencyPostedJob {
  return {
    id: job.id,
    title: job.title,
    status: AGENCY_STATUS_LABEL[job.status] ?? job.status,
    type: EMPLOYMENT_TYPE_LABELS[job.employmentType] ?? job.employmentType,
    location: job.location,
    pay: formatSalary(job) ?? undefined,
    applicants: job.applicationsCount ?? 0,
    postedAgo: `Posted ${formatRelative(job.createdAt)}`,
  }
}


const userTabs = ["About", "Experience", "Skills", "Certifications", "Posts"] as const
const agencyTabs = ["About", "Posted jobs", "Team", "Certifications", "Posts"] as const
type ProfileTab = (typeof userTabs)[number] | (typeof agencyTabs)[number]

export default function ProfilePage() {
  const { user } = useAuthUser()
  const { flow } = useCareFlow()
  const navigate = useNavigate()
  const isAgency = flow === "agency"
  const [profileSummary, setProfileSummary] = useState(defaultSummary)
  const [agencySummary, setAgencySummary] = useState(defaultAgencySummary)
  const [identityLoading, setIdentityLoading] = useState(true)
  const [postedJobs, setPostedJobs] = useState<AgencyPostedJob[]>([])
  const [specialties, setSpecialties] = useState<string[]>([])
  const [me, setMe] = useState<CareConnectProfile | null>(null)
  const summary = isAgency ? agencySummary : profileSummary
  const tabs = isAgency ? agencyTabs : userTabs
  const [activeTab, setActiveTab] = useState<ProfileTab>("About")

  // Single profile fetch for the whole page: header identity, counters, and every
  // editable surface below all read from `me`.
  useEffect(() => {
    if (!user?.uid) return
    let active = true
    ;(async () => {
      try {
        const profile = await getProfile(user.uid)
        if (!active) return
        setMe(profile)
        setProfileSummary({
          name: profile.name || user.fullName || "",
          headline: profile.subtitle || "",
          location: profile.location || "",
          email: user.email || "",
          phone: user.phoneNumber || "",
          metrics: [
            { label: "Connections", value: String(profile.connectionsCount ?? 0) },
            { label: "Profile views", value: String(profile.profileViewsCount ?? 0) },
            { label: "Application views", value: String(profile.applicationViewsCount ?? 0) },
          ],
        })

        if (isAgency) {
          const jobs = await listMyJobs().catch(() => [])
          if (!active) return
          setPostedJobs(jobs.map(toPostedJob))
          setSpecialties(Array.isArray(profile.organizationInterests) ? profile.organizationInterests : [])
          setAgencySummary({
            name: profile.name || user.fullName || "",
            headline: profile.subtitle || "",
            location: profile.location || "",
            email: user.email || "",
            phone: user.phoneNumber || "",
            metrics: [
              { label: "Connections", value: String(profile.connectionsCount ?? 0) },
              { label: "Profile views", value: String(profile.profileViewsCount ?? 0) },
              { label: "Jobs posted", value: String(jobs.length) },
            ],
          })
        }
      } catch {
        // fall back to auth identity only
        if (active) {
          const identity = {
            name: user.fullName || "",
            email: user.email || "",
            phone: user.phoneNumber || "",
          }
          setProfileSummary((prev) => ({ ...prev, ...identity }))
          setAgencySummary((prev) => ({ ...prev, ...identity }))
        }
      } finally {
        if (active) setIdentityLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [user?.uid, user?.fullName, user?.email, user?.phoneNumber, isAgency])

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [experienceOpen, setExperienceOpen] = useState(false)
  const [skillOpen, setSkillOpen] = useState(false)
  const [specialtyOpen, setSpecialtyOpen] = useState(false)
  const [certificationOpen, setCertificationOpen] = useState(false)
  const [editingCertificationIndex, setEditingCertificationIndex] = useState<number | null>(null)
  const [teamInviteOpen, setTeamInviteOpen] = useState(false)
  const [experience, setExperience] = useState<ProfileExperience[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [certifications, setCertifications] = useState<ProfileCertification[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [portfolio, setPortfolio] = useState<FeedPost[]>([])
  const [portfolioLoading, setPortfolioLoading] = useState(true)
  const [newSkill, setNewSkill] = useState("")
  const [newSpecialty, setNewSpecialty] = useState("")
  const [newExperience, setNewExperience] = useState({ role: "", company: "", duration: "", description: "" })
  const [newCertification, setNewCertification] = useState({ title: "", provider: "", date: "", endDate: "", file: "" })
  const [newTeamInvite, setNewTeamInvite] = useState({ phone: "", email: "", fullName: "" })

  // Load the agency's roster (Team tab).
  useEffect(() => {
    if (!isAgency || !user?.uid) return
    let active = true
    ;(async () => {
      try {
        const members = await listMyTeam()
        if (active) setTeamMembers(members)
      } catch {
        // roster is non-critical; leave empty on failure
      }
    })()
    return () => {
      active = false
    }
  }, [isAgency, user?.uid])

  // Load the user's own posts for the Portfolio tab, and prepend live when they
  // compose a new one (PostComposer fires POST_CREATED_EVENT).
  useEffect(() => {
    if (!user?.uid) return
    let active = true
    ;(async () => {
      setPortfolioLoading(true)
      try {
        const posts = await listFeed({ authorId: user.uid })
        if (active) setPortfolio(posts)
      } catch {
        // portfolio is non-critical; leave empty on failure
      } finally {
        if (active) setPortfolioLoading(false)
      }
    })()

    const onCreated = (event: Event) => {
      const post = (event as CustomEvent<FeedPost>).detail
      if (post) setPortfolio((current) => [post, ...current])
    }
    window.addEventListener(POST_CREATED_EVENT, onCreated)
    return () => {
      active = false
      window.removeEventListener(POST_CREATED_EVENT, onCreated)
    }
  }, [user?.uid])

  const handleRemovePost = async (id: string) => {
    const previous = portfolio
    setPortfolio((current) => current.filter((item) => item.id !== id))
    try {
      await deletePost(id)
      toast.success("Post removed")
    } catch (error) {
      setPortfolio(previous)
      toast.error(getAuthErrorMessage(error))
    }
  }

  const withdrawInvite = async (id: string) => {
    const previous = teamMembers
    setTeamMembers((current) => current.filter((member) => member.id !== id))
    try {
      await removeTeamMember(id)
    } catch (error) {
      setTeamMembers(previous)
      toast.error(getAuthErrorMessage(error))
    }
  }

  const handleInviteTeamMember = async (input: { fullName: string; email: string; phone: string }) => {
    try {
      const email = input.email.trim()
      const inviteUrlBase = new URL(Routes.auth.professionalInvite, window.location.origin).toString()
      const member = await inviteTeamMember({
        name: input.fullName.trim(),
        email: email || undefined,
        phone: input.phone.trim() || undefined,
        inviteUrlBase,
      })
      setTeamMembers((current) => [member, ...current])

      // Always copy the link as a fallback; the backend also emails it when an address is given.
      const inviteUrl = new URL(Routes.auth.professionalInvite, window.location.origin)
      inviteUrl.searchParams.set("invite", member.inviteToken)
      inviteUrl.searchParams.set("name", member.name)
      if (member.email) inviteUrl.searchParams.set("email", member.email)
      if (member.phone) inviteUrl.searchParams.set("phone", member.phone)
      await navigator.clipboard?.writeText(inviteUrl.toString()).catch(() => undefined)

      if (member.emailed) {
        toast.success(`Invitation emailed to ${email} — link also copied.`)
      } else if (email) {
        toast.success("Invite link copied. (Email delivery is unavailable — send the link directly.)")
      } else {
        toast.success("Invite link copied — send it to the new team member to set up their dashboard.")
      }
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    }
  }

  /**
   * Spreadsheet import. Rows were already validated client-side; the backend
   * still reports per-row outcomes, which the dialog renders as a summary.
   */
  const handleBulkInviteTeamMembers = async (
    members: BulkInviteMemberInput[],
  ): Promise<BulkInviteResult | undefined> => {
    try {
      const inviteUrlBase = new URL(Routes.auth.professionalInvite, window.location.origin).toString()
      const result = await bulkInviteTeamMembers({ members, inviteUrlBase })
      if (result.members.length > 0) {
        setTeamMembers((current) => [...result.members, ...current])
      }
      if (result.invited > 0) {
        toast.success(
          `${result.invited} invitation${result.invited === 1 ? "" : "s"} sent` +
            (result.skipped > 0 ? ` — ${result.skipped} row${result.skipped === 1 ? "" : "s"} skipped.` : "."),
        )
      } else {
        toast.error("No invitations were sent — every row was rejected.")
      }
      return result
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
      return undefined
    }
  }

  const {
    accountInfo,
    setAccountInfo,
    saveAccountInfo,
    handleDeactivate,
    handleDelete,
    notificationOptions,
    updateNotification,
    saveNotifications,
    privacyOptions,
    updatePrivacy,
    savePrivacy,
  } = useAccountSettings({
    profile: me,
    onSaved: (info) =>
      setProfileSummary((prev) => ({
        ...prev,
        name: info.fullName,
        headline: info.headline,
        location: info.location,
        phone: info.phone,
      })),
  })

  const [avatarSrc, setAvatarSrc] = useState<string | null>(null)
  const [coverSrc, setCoverSrc] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  // Hydrate the editable surfaces (images, experience/skills/certifications) from
  // the profile loaded above.
  useEffect(() => {
    if (!me) return
    if (me.photo) setAvatarSrc(me.photo)
    if (me.coverImage) setCoverSrc(me.coverImage)
    if (Array.isArray(me.skills)) setSkills(me.skills)
    if (Array.isArray(me.experience)) setExperience(me.experience)
    if (Array.isArray(me.certificationDetails)) setCertifications(me.certificationDetails)
  }, [me])

  // Upload an image, persist its URL on the users doc, and show it.
  const handleImageUpload = async (file: File, field: "profilePicture" | "coverImage", setPreview: (url: string) => void) => {
    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)
    try {
      const url = await uploadProfileImage(file)
      await updateUserProfile({ [field]: url })
      setPreview(url)
      toast.success(field === "profilePicture" ? "Profile photo updated" : "Cover photo updated")
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    }
  }

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) void handleImageUpload(file, "profilePicture", setAvatarSrc)
  }

  const handleCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) void handleImageUpload(file, "coverImage", setCoverSrc)
  }

  // Persisting wrappers for the editable lists (optimistic local update + backend save).
  const persistCareConnect = (fields: Parameters<typeof updateCareConnectProfile>[0]) =>
    updateCareConnectProfile(fields).catch((error) => toast.error(getAuthErrorMessage(error)))

  const updateExperience = (next: typeof experience) => {
    setExperience(next)
    void persistCareConnect({ experience: next })
  }
  const updateSkills = (next: string[]) => {
    setSkills(next)
    void persistCareConnect({ skills: next })
  }
  const updateCertifications = (next: ProfileCertification[]) => {
    setCertifications(next)
    void persistCareConnect({ certificationDetails: next })
  }
  const updateSpecialties = (next: string[]) => {
    setSpecialties(next)
    void persistCareConnect({ organizationInterests: next })
  }

  return (
    <div className="px-7.5 pb-10 pt-4">
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />

      <section className="relative mx-auto max-w-250">
        <div className="overflow-hidden rounded-[28px] border border-[#d6d6d6] bg-white shadow-sm">
          <div
            className="relative h-56 bg-linear-to-r from-[#02e0e4] via-[#00b4b8] to-[#006668] bg-cover bg-center"
            style={coverSrc ? { backgroundImage: `url(${coverSrc})` } : undefined}
          >
            <div className="absolute z-10 right-6 top-6">
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition bg-[#ffffff31] border rounded-full shadow-sm border-white/80 hover:bg-[#03362f] cursor-pointer"
              >
                <Camera className="size-5" />
                Change cover
              </button>
            </div>
          </div>

          <div className="relative px-6 pt-6 pb-6 sm:px-8">
            <div className="absolute -top-16 left-6">
              <div className="relative h-28 w-28 rounded-[30px] border-4 border-white bg-white p-2 shadow-xl">
                <div className="h-full w-full overflow-hidden rounded-full flex items-center justify-center bg-[#00b4b8]">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="Profile" className="object-cover w-full h-full" />
                  ) : (
                    <UserRound className="size-30 text-[#ffffff]" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  aria-label="Change profile photo"
                  className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full border-2 border-white bg-[#00b4b8] text-white shadow-md transition hover:bg-[#00595a] cursor-pointer"
                >
                  <Pencil className="size-4" />
                </button>
              </div>
            </div>

            <div className="mt-10">
              {identityLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-56" />
                  <Skeleton className="h-4 w-80 max-w-full" />
                  <div className="flex flex-wrap gap-4 pt-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ) : (
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-[#151922]">{summary.name}</h1>
                  <p className="mt-2 text-sm leading-6 text-black">{summary.headline}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[#656f80]">
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="text-black size-4" />
                      {summary.location}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Mail className="text-black size-4" />
                      {summary.email}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Phone className="text-black size-4" />
                      {summary.phone}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-6 overflow-hidden rounded-3xl border-t-2 border-[#e5ecf5] pt-2">
                <div className="grid grid-cols-2 text-center sm:grid-cols-4">
                  {summary.metrics.map((metric, index) => (
                    <div key={metric.label} className={`${index > 0 ? "border-l border-[#e6eaf0]" : ""} px-4 py-5`}>
                      {identityLoading ? (
                        <Skeleton className="mx-auto mt-3 h-8 w-10" />
                      ) : (
                        <p className="mt-3 text-3xl font-semibold text-[#151922]">{metric.value}</p>
                      )}
                      <p className="text-sm text-black">{metric.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-[28px] border border-[#d6d6d6] bg-white shadow-sm max-w-250 mx-auto">
        <div className="border-b border-[#e7ecf1] bg-[#f8fbff] px-6 py-4 sm:px-8">
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition cursor-pointer ${
                  activeTab === tab
                    ? "bg-white text-[#00b4b8] border-b-4 hover:border-[#00b4b8]"
                    : "text-[#6b7280] hover:bg-white/80"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-8 sm:px-8">
          {activeTab === "About" && isAgency && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#151922]">Company Overview</h2>
                <p className="max-w-3xl mt-3 text-sm leading-7">
                  {summary.headline || "This organization hasn't added an overview yet."}
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold">Specialties</h3>
                  <button
                    type="button"
                    onClick={() => setSpecialtyOpen(true)}
                    className="text-sm font-semibold text-[#00b4b8] cursor-pointer"
                  >
                    {specialties.length === 0 ? "+ Add specialties" : "Edit"}
                  </button>
                </div>
                {specialties.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {specialties.map((item) => (
                      <span key={item} className="inline-flex items-center justify-center rounded-full bg-[#e3f8f8] px-4 py-2 text-sm text-[#00b4b8] font-semibold border border-[#00b4b8]">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-[#657080]">No specialties added yet.</p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold">Contact information</h3>
                <div className="mt-4 space-x-4">
                  {summary.location && (
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="text-black size-4" />
                      {summary.location}
                    </span>
                  )}
                  {summary.email && (
                    <span className="inline-flex items-center gap-2">
                      <Mail className="text-black size-4" />
                      {summary.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "About" && !isAgency && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#151922]">About</h2>
                {/* Same field the Account settings dialog saves as "Job description". */}
                <p className="max-w-3xl mt-3 text-sm leading-7 ">
                  {accountInfo.description || "You haven't added an About section yet."}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-bold">Contact</h3>
                <div className="mt-4 space-x-4 ">
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="text-black size-4" />
                    {profileSummary.location}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Mail className="text-black size-4" />
                    {profileSummary.email}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Phone className="text-black size-4" />
                    {profileSummary.phone}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Posted jobs" && (
            <div className="space-y-4">
              {postedJobs.length === 0 && (
                <p className="rounded-3xl border border-dashed border-[#e5ecf5] p-6 text-center text-sm text-[#657080]">
                  You haven&apos;t posted any jobs yet.
                </p>
              )}
              {postedJobs.map((job) => (
                <div key={job.id} className="rounded-3xl border border-[#e5ecf5] p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-base font-semibold text-[#151922]">{job.title}</h3>
                    <span className="rounded-full bg-[#e9f9f0] px-3 py-1 text-xs font-semibold text-[#0f8a4d]">{job.status}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[#656f80]">
                    <span className="inline-flex items-center gap-2">
                      <Briefcase className="size-4" />
                      {job.type}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="size-4" />
                      {job.location}
                    </span>
                    {job.pay && (
                      <span className="inline-flex items-center gap-2 font-semibold text-[#0f8a4d]">
                        <Banknote className="size-4" />
                        {job.pay}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-4 border-t border-[#eef1f3]">
                    <span className="inline-flex items-center gap-2 text-sm text-[#656f80]">
                      <Users className="size-4" />
                      {job.applicants} applicants · {job.postedAgo}
                    </span>
                    <Button variant="outline" className="text-[#00b4b8]" onClick={() => navigate(Routes.app.agency.jobs)}>
                      View applicants
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "Team" && (
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#e5ecf5] p-5">
                  <div className="flex items-center gap-4">
                    <div className={`flex size-12 items-center justify-center rounded-full ${member.avatarBg}`}>
                      <UserRound className="text-white size-7" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#151922]">{member.name}</p>
                      {/* A member without a set role (invited, or a backend "Unknown"
                          placeholder) gets a blank line rather than showing "Unknown". */}
                      <p className="mt-1 text-sm text-[#656f80]">
                        {member.status === "invited" || !member.role || member.role.trim().toLowerCase() === "unknown"
                          ? " "
                          : member.role}
                      </p>
                    </div>
                  </div>
                  {member.status === "invited" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-[#00b4b8] text-[#00b4b8] hover:bg-[#e3f8f8]"
                      onClick={() => withdrawInvite(member.id)}
                    >
                      Withdraw invite
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="rounded-full border-[#00b4b8] text-[#00b4b8] hover:bg-[#e3f8f8]">
                      Message
                    </Button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setTeamInviteOpen(true)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#00b4b8] cursor-pointer"
              >
                <UserPlus className="size-4" />
                Invite team members
              </button>
            </div>
          )}

          {activeTab === "Experience" && (
            <div className="space-y-6">
              {experience.length === 0 && (
                <p className="rounded-3xl border border-dashed border-[#e5ecf5] p-6 text-center text-sm text-[#657080]">
                  You haven&apos;t added any experience yet.
                </p>
              )}
              {experience.map((item) => (
                <div key={item.role} className="rounded-3xl border border-[#e5ecf5] p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-[#151922]">{item.role}</p>
                      <p className="text-sm text-[#00898c]">{item.company}</p>
                    </div>
                    <span className="text-sm text-[#6b7280]">{item.duration}</span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[#505964]">{item.description}</p>
                </div>
              ))}
              <Button className="text-[#00b4b8] border-0 hover:border-2" variant="outline" onClick={() => setExperienceOpen(true)}>
                + Add experience
              </Button>
            </div>
          )}

          {activeTab === "Skills" && (
            <div className="space-y-6">
              {skills.length === 0 ? (
                <p className="rounded-3xl border border-dashed border-[#e5ecf5] p-6 text-center text-sm text-[#657080]">
                  You haven&apos;t added any skills yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span key={skill} className="inline-flex items-center justify-center rounded-full bg-[#e3f8f8] px-4 py-2 text-sm text-[#00b4b8] font-semibold border border-[#00b4b8]">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
              <Button className="text-[#00b4b8] border-0 hover:border-2" variant="outline" onClick={() => setSkillOpen(true)}>
                {skills.length === 0 ? "+ Add skills" : "Edit skills"}
              </Button>
            </div>
          )}

          {activeTab === "Certifications" && (
            <div className="space-y-4">
              {certifications.length === 0 && (
                <p className="rounded-3xl border border-dashed border-[#e5ecf5] p-6 text-center text-sm text-[#657080]">
                  You haven&apos;t added any certifications yet.
                </p>
              )}
              {certifications.map((cert, index) => {
                // Recomputed from the expiry date so the badge doesn't go stale.
                const status = certificationStatus(cert.endDate)
                const period = formatCertificationPeriod(cert.date, cert.endDate)
                return (
                  <div key={`${cert.title}-${index}`} className="flex flex-col gap-3 rounded-3xl border border-[#e5ecf5] p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#151922]">{cert.title}</p>
                      {(cert.provider || period) && (
                        <p className="mt-1 text-sm text-[#00898c]">{[cert.provider, period].filter(Boolean).join(" · ")}</p>
                      )}
                      {/* The attachment was previously collected and discarded; surface it
                          so an upload is visibly stored rather than silently gone. */}
                      {cert.fileUrl && (
                        <a
                          href={cert.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-[#00898c] hover:underline"
                        >
                          <Paperclip className="size-3.5" />
                          {cert.fileName || "View certificate"}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-sm ${status === "Active" ? "bg-[#e9f9f0] text-[#0f8a4d]" : "bg-[#fff2f0] text-[#d8442a]"}`}>
                        {status}
                      </span>
                      <button
                        type="button"
                        aria-label={`Edit ${cert.title}`}
                        onClick={() => {
                          setNewCertification({ title: cert.title, provider: cert.provider, date: cert.date, endDate: cert.endDate ?? "", file: "" })
                          setEditingCertificationIndex(index)
                          setCertificationOpen(true)
                        }}
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#e5ecf5] text-[#657080] transition hover:border-[#00b4b8] hover:text-[#00b4b8]"
                      >
                        <Pencil className="size-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
              <Button
                className="text-[#00b4b8] border-0 hover:border-2"
                variant="outline"
                onClick={() => {
                  setNewCertification({ title: "", provider: "", date: "", endDate: "", file: "" })
                  setEditingCertificationIndex(null)
                  setCertificationOpen(true)
                }}
              >
                + Add certification
              </Button>
            </div>
          )}

          {activeTab === "Posts" && (
            <div className="space-y-6">
              <PostComposer />

              {portfolioLoading ? (
                <div className="space-y-6">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="rounded-3xl border border-[#e5ecf5] p-5">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-11 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-11/12" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                      <Skeleton className="mt-4 h-40 w-full rounded-2xl" />
                    </div>
                  ))}
                </div>
              ) : portfolio.length === 0 ? (
                <div className="rounded-3xl border border-[#e5ecf5] bg-[#f7fafc] p-6">
                  <p className="text-sm text-[#687182]">Portfolio updates will appear here.</p>
                  <p className="mt-4 text-sm leading-7 text-[#505964]">
                    Create posts, highlight work, and share recent achievements so your network can see your best care stories.
                  </p>
                </div>
              ) : (
                portfolio.map((post) => (
                  <PortfolioPost
                    key={post.id}
                    authorName={summary.name}
                    authorRole={summary.headline || (isAgency ? "Healthcare Agency" : "Care Connect member")}
                    avatarClassName="bg-[#6b9cca]"
                    initials={getInitials(summary.name)}
                    post={toPortfolioData(post)}
                    editable
                    initialLiked={post.likedByMe}
                    initialCommentCount={post.commentsCount ?? 0}
                    onRemove={() => handleRemovePost(post.id)}
                    onLikeChange={(next) => {
                      const call = next ? likePost : unlikePost
                      call(post.id).catch(() => undefined)
                    }}
                    onSubmitComment={(text) => {
                      addComment(post.id, text).catch(() => undefined)
                    }}
                    onLoadComments={async (): Promise<PostComment[]> => {
                      const comments = await listComments(post.id)
                      return comments.map((c) => ({ id: c.id, author: c.author, text: c.text }))
                    }}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </section>

      <ProfileModals
        notificationsOpen={notificationsOpen}
        onNotificationsOpenChange={setNotificationsOpen}
        privacyOpen={privacyOpen}
        onPrivacyOpenChange={setPrivacyOpen}
        settingsOpen={settingsOpen}
        onSettingsOpenChange={setSettingsOpen}
        experienceOpen={experienceOpen}
        onExperienceOpenChange={setExperienceOpen}
        skillOpen={skillOpen}
        onSkillOpenChange={setSkillOpen}
        certificationOpen={certificationOpen}
        onCertificationOpenChange={setCertificationOpen}
        notificationOptions={notificationOptions}
        onNotificationOptionChange={updateNotification}
        onSaveNotifications={saveNotifications}
        privacyOptions={privacyOptions}
        onPrivacyOptionChange={updatePrivacy}
        onSavePrivacy={savePrivacy}
        accountInfo={accountInfo}
        onAccountInfoChange={setAccountInfo}
        onSaveAccountInfo={saveAccountInfo}
        onDeactivate={handleDeactivate}
        onDelete={handleDelete}
        experience={experience}
        onExperienceChange={updateExperience}
        newExperience={newExperience}
        onNewExperienceChange={setNewExperience}
        skills={skills}
        onSkillsChange={updateSkills}
        newSkill={newSkill}
        onNewSkillChange={setNewSkill}
        specialtyOpen={specialtyOpen}
        onSpecialtyOpenChange={setSpecialtyOpen}
        specialties={specialties}
        onSpecialtiesChange={updateSpecialties}
        newSpecialty={newSpecialty}
        onNewSpecialtyChange={setNewSpecialty}
        certifications={certifications}
        onCertificationsChange={updateCertifications}
        newCertification={newCertification}
        onNewCertificationChange={setNewCertification}
        editingCertificationIndex={editingCertificationIndex}
        onEditingCertificationIndexChange={setEditingCertificationIndex}
        teamInviteOpen={teamInviteOpen}
        onTeamInviteOpenChange={setTeamInviteOpen}
        newTeamInvite={newTeamInvite}
        onNewTeamInviteChange={setNewTeamInvite}
        onInviteTeamMember={handleInviteTeamMember}
        onBulkInviteTeamMembers={handleBulkInviteTeamMembers}
      />
    </div>
  )
}
