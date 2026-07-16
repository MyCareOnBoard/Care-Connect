import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { ArrowLeft, Mail, MapPin, Phone, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FollowButton } from "@/components/app/FollowButton"
import { PortfolioPost } from "@/components/profile/PortfolioPost"
import { useCareFlow } from "@/components/app/useCareFlow"
import { Routes } from "@/routes/constants"
import { getProfessionalProfile } from "@/data/professionals"

const profileTabs = ["About", "Experience", "Skills", "Certifications", "Portfolio"] as const
type ProfileTab = (typeof profileTabs)[number]

export default function ViewProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { flow } = useCareFlow()
  const [activeTab, setActiveTab] = useState<ProfileTab>("About")
  const profile = getProfessionalProfile(id ?? "")
  const messagesPath = flow === "agency" ? Routes.app.agency.messages : Routes.app.user.messages

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
                <div className={`flex h-full w-full items-center justify-center rounded-full ${profile.avatarClassName}`}>
                  <UserRound className="size-16 text-white" />
                </div>
              </div>
            </div>

            <div className="mt-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-[#151922]">{profile.name}</h1>
                  <p className="mt-2 text-sm leading-6 text-black">{profile.headline}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[#656f80]">
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="text-black size-4" />
                      {profile.location}
                    </span>
                    {profile.email && (
                      <span className="inline-flex items-center gap-2">
                        <Mail className="text-black size-4" />
                        {profile.email}
                      </span>
                    )}
                    {profile.phone && (
                      <span className="inline-flex items-center gap-2">
                        <Phone className="text-black size-4" />
                        {profile.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button asChild className="h-10 rounded-full bg-[#087fff] px-5 text-white hover:opacity-90">
                    <Link to={messagesPath}>Message</Link>
                  </Button>
                  <FollowButton label="Connect" activeLabel="Pending" />
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-3xl border-t-2 border-[#e5ecf5] pt-2">
                <div className="grid grid-cols-2 text-center sm:grid-cols-4">
                  {profile.metrics.map((metric, index) => (
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
                <p className="max-w-3xl mt-3 text-sm leading-7">{profile.about}</p>
              </div>
              <div>
                <h3 className="text-sm font-bold">Contact</h3>
                <div className="mt-4 space-x-4">
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="text-black size-4" />
                    {profile.location}
                  </span>
                  {profile.email && (
                    <span className="inline-flex items-center gap-2">
                      <Mail className="text-black size-4" />
                      {profile.email}
                    </span>
                  )}
                  {profile.phone && (
                    <span className="inline-flex items-center gap-2">
                      <Phone className="text-black size-4" />
                      {profile.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "Experience" && (
            <div className="space-y-6">
              {profile.experience.length === 0 && <p className="text-sm text-[#687182]">No experience added yet.</p>}
              {profile.experience.map((item) => (
                <div key={item.role} className="rounded-3xl border border-[#e5ecf5] p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-[#151922]">{item.role}</p>
                      <p className="text-sm text-[#0f4fe3]">{item.company}</p>
                    </div>
                    <span className="text-sm text-[#6b7280]">{item.duration}</span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[#505964]">{item.description}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "Skills" && (
            <div className="space-y-6">
              {profile.skills.length === 0 && <p className="text-sm text-[#687182]">No skills added yet.</p>}
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <span key={skill} className="inline-flex items-center justify-center rounded-full bg-[#eef5ff] px-4 py-2 text-sm font-semibold text-[#087fff] border border-[#087fff]">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {activeTab === "Certifications" && (
            <div className="space-y-4">
              {profile.certifications.length === 0 && <p className="text-sm text-[#687182]">No certifications added yet.</p>}
              {profile.certifications.map((cert) => (
                <div key={cert.title} className="flex flex-col gap-3 rounded-3xl border border-[#e5ecf5] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#151922]">{cert.title}</p>
                    <p className="mt-1 text-sm text-[#0f4fe3]">{cert.provider} · {cert.date}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm ${cert.status === "Active" ? "bg-[#e9f9f0] text-[#0f8a4d]" : "bg-[#fff2f0] text-[#d8442a]"}`}>
                    {cert.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "Portfolio" && (
            <div className="space-y-6">
              {profile.portfolio.length === 0 ? (
                <div className="rounded-3xl border border-[#e5ecf5] bg-[#f7fafc] p-6">
                  <p className="text-sm text-[#687182]">No portfolio items yet.</p>
                </div>
              ) : (
                profile.portfolio.map((post) => (
                  <PortfolioPost
                    key={post.id}
                    authorName={profile.name}
                    authorRole={profile.headline}
                    avatarClassName={profile.avatarClassName}
                    initials={profile.initials}
                    post={post}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
