import { BriefcaseBusiness, Sparkles, UsersRound, Video } from "lucide-react"

const highlights = [
  {
    icon: BriefcaseBusiness,
    title: "1,847+ Jobs",
    subtitle: "Healthcare roles nationwide",
  },
  {
    icon: Video,
    title: "Telehealth",
    subtitle: "Secure virtual visits",
  },
  {
    icon: Sparkles,
    title: "AI Copilot",
    subtitle: "Career intelligence",
  },
  {
    icon: UsersRound,
    title: "Communities",
    subtitle: "Professional networks",
  },
]

export function AuthMarketingPanel() {
  return (
    <aside className="relative hidden h-screen overflow-hidden px-4 py-10 text-white lg:flex lg:w-[44%] lg:flex-col lg:justify-between">
      <div className="absolute inset-0 opacity-30 bg-[linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)]" />

      <div className="relative max-w-155">
        <h1 className="text-6xl font-normal leading-[1.18] tracking-normal">
          Connecting Care, Careers, Commerce &amp; Community.
        </h1>
        <p className="mt-5 max-w-140 text-[16px] font-light leading-5 text-white/90">
          The AI-powered healthcare ecosystem for professionals, agencies, families, and communities.
        </p>
      </div>

      <div className="relative grid grid-cols-2 gap-4 max-w-150">
        {highlights.map((item) => {
          const Icon = item.icon

          return (
            <div
              key={item.title}
              className="min-h-25.5 rounded-2xl border border-white/30 bg-white/[0.07] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md"
            >
              <Icon className="size-5" />
              <p className="mt-4 text-xl font-normal leading-none">{item.title}</p>
              <p className="mt-3 text-sm text-white/80">{item.subtitle}</p>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
