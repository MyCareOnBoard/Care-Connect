import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { ArrowLeft, MapPin } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FollowButton } from "@/components/app/FollowButton"
import { Skeleton } from "@/components/ui/skeleton"
import { useCareFlow } from "@/components/app/useCareFlow"
import { Routes } from "@/routes/constants"
import { getAuthErrorMessage } from "@/utils/auth"
import { getInitials } from "@/lib/utils"
import { getProfile } from "@/utils/careconnect/services/profilesService"
import type { CareConnectProfile } from "@/utils/careconnect/types"

const profileTabs = ["About", "Certifications"] as const
type ProfileTab = (typeof profileTabs)[number]

/** Certifications are stored verbatim by the client — normalize to a display record. */
function normalizeCert(cert: unknown): { title: string; provider?: string; date?: string; status?: string } {
  if (typeof cert === "string") return { title: cert }
  if (cert && typeof cert === "object") {
    const c = cert as Record<string, unknown>
    return {
      title: String(c.title ?? c.name ?? "Certification"),
      provider: c.provider ? String(c.provider) : undefined,
      date: c.date ? String(c.date) : undefined,
      status: c.status ? String(c.status) : undefined,
    }
  }
  return { title: "Certification" }
}

export default function ViewProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { flow } = useCareFlow()
  const [activeTab, setActiveTab] = useState<ProfileTab>("About")
  const [profile, setProfile] = useState<CareConnectProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const messagesPath = flow === "agency" ? Routes.app.agency.messages : Routes.app.user.messages

  useEffect(() => {
    if (!id) return
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const data = await getProfile(id)
        if (active) setProfile(data)
      } catch (error) {
        if (active) toast.error(getAuthErrorMessage(error))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="animate-fade-in-up px-7.5 pb-10 pt-4">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="mx-auto mt-4 h-80 max-w-250 rounded-[28px]" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="animate-fade-in-up px-7.5 pb-10 pt-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-full border border-[#e2e2e2] bg-white px-4 py-2 text-sm font-semibold text-[#151922] transition hover:bg-[#f2f6f8]"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
        <p className="mx-auto mt-10 max-w-250 rounded-[28px] border border-dashed border-[#d6d6d6] p-10 text-center text-sm text-[#657080]">
          This profile isn&apos;t available.
        </p>
      </div>
    )
  }

  const certifications = profile.certifications.map(normalizeCert)
  const metrics = [
    { label: "Profile views", value: String(profile.profileViewsCount ?? 0) },
    { label: "Connections", value: String(profile.connectionsCount ?? 0) },
  ]

  return (
    <div className="animate-fade-in-up px-7.5 pb-10 pt-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 rounded-full border border-[#e2e2e2] bg-white px-4 py-2 text-sm font-semibold text-[#151922] transition hover:bg-[#f2f6f8]"
      >
        <ArrowLeft className="size-4" />
        Back
      </button>

      <section className="relative mx-auto mt-4 max-w-250">
        <div className="overflow-hidden rounded-[28px] border border-[#d6d6d6] bg-white shadow-sm">
          <div className="relative h-56 bg-linear-to-r from-[#02266e] via-[#003289] to-[#0459E9]" />

          <div className="relative px-6 pt-6 pb-6 sm:px-8">
            <div className="absolute -top-16 left-6">
              <div className="h-28 w-28 rounded-[30px] border-4 border-white bg-white p-2 shadow-xl">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-[#087fff] text-2xl font-bold text-white">
                  {profile.photo ? (
                    <img src={profile.photo} alt={profile.name} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    getInitials(profile.name)
                  )}
                </div>
              </div>
            </div>

            <div className="mt-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-[#151922]">{profile.name || "Care Connect user"}</h1>
                  <p className="mt-2 text-sm leading-6 text-black">{profile.subtitle}</p>
                  {profile.location && (
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[#656f80]">
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="text-black size-4" />
                        {profile.location}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Button asChild className="h-10 rounded-full bg-[#087fff] px-5 text-white hover:opacity-90">
                    <Link to={messagesPath}>Message</Link>
                  </Button>
                  <FollowButton
                    label="Connect"
                    activeLabel="Pending"
                    targetId={profile.uid}
                    relation={profile.userType === "careconnect_company" || profile.userType === "agency" ? "subscribe" : "connect"}
                    initialActive={profile.isFollowing}
                  />
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-3xl border-t-2 border-[#e5ecf5] pt-2">
                <div className="grid grid-cols-2 text-center">
                  {metrics.map((metric, index) => (
                    <div key={metric.label} className={`${index > 0 ? "border-l border-[#e6eaf0]" : ""} px-4 py-5`}>
                      <p className="mt-3 text-3xl font-semibold text-[#151922]">{metric.value}</p>
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
            {profileTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition cursor-pointer ${
                  activeTab === tab
                    ? "bg-white text-[#087fff] border-b-4 hover:border-[#087fff]"
                    : "text-[#6b7280] hover:bg-white/80"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-8 sm:px-8">
          {activeTab === "About" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#151922]">About</h2>
                <p className="max-w-3xl mt-3 text-sm leading-7 text-[#505964]">
                  {profile.organizationType
                    ? `${profile.organizationType} organization.`
                    : profile.profession
                      ? `${profile.profession} on Care Connect.`
                      : "No details added yet."}
                </p>
              </div>
              {profile.organizationInterests.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold">Interests</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.organizationInterests.map((interest) => (
                      <span key={interest} className="inline-flex items-center rounded-full bg-[#eef5ff] px-4 py-2 text-sm font-semibold text-[#087fff] border border-[#087fff]">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {profile.location && (
                <div>
                  <h3 className="text-sm font-bold">Location</h3>
                  <span className="mt-3 inline-flex items-center gap-2 text-sm">
                    <MapPin className="text-black size-4" />
                    {profile.location}
                  </span>
                </div>
              )}
            </div>
          )}

          {activeTab === "Certifications" && (
            <div className="space-y-4">
              {certifications.length === 0 && <p className="text-sm text-[#687182]">No certifications added yet.</p>}
              {certifications.map((cert, index) => (
                <div key={`${cert.title}-${index}`} className="flex flex-col gap-3 rounded-3xl border border-[#e5ecf5] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#151922]">{cert.title}</p>
                    {(cert.provider || cert.date) && (
                      <p className="mt-1 text-sm text-[#0f4fe3]">{[cert.provider, cert.date].filter(Boolean).join(" · ")}</p>
                    )}
                  </div>
                  {cert.status && (
                    <span className={`rounded-full px-3 py-1 text-sm ${cert.status === "Active" ? "bg-[#e9f9f0] text-[#0f8a4d]" : "bg-[#fff2f0] text-[#d8442a]"}`}>
                      {cert.status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
