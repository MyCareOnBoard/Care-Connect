import { Avatar } from "@/components/app/DashboardAvatar"
import { FollowButton } from "@/components/app/FollowButton"

export function FeaturedPost() {
  return (
    <article className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-[0_4px_20px_rgba(16,20,26,0.05)] backdrop-blur-md">
      <div className="flex items-start gap-3">
        <Avatar className="bg-[linear-gradient(135deg,#ffd08a,#67a6d9)]" initials="SM" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Dr. Sarah Mitchell</h2>
              <p className="mt-1 text-sm text-[#565656]">Registered Nurse | Mental Health Advocate</p>
            </div>
            <FollowButton label="Connect" activeLabel="Pending" />
          </div>

          <div className="mt-5 max-w-162.5 text-sm leading-5">
            <p>Nobody talks about the weight nurses carry home.</p>
            <p>Not the medical charts. Not the missed lunch breaks.</p>
            <p>The weight of the patient who didn&apos;t make it through the night.</p>
            <p>Burnout in healthcare isn&apos;t a weakness.</p>
            <p>It&apos;s what happens when compassionate people give everything - without being given anything back.</p>
            <p>Check on your nurses. Ask your doctors how they&apos;re doing.</p>
            <p>Mental health care is healthcare.</p>
          </div>

          <p className="mt-6 text-sm font-bold">
            #NurseLife #HealthcareWorkers #MentalHealth #BurnoutAwareness
          </p>

          <div className="group/quote relative mt-4 flex min-h-114 items-center overflow-hidden rounded-t-xl bg-black px-11 py-12 text-white transition-transform duration-300 hover:scale-[1.01]">
            <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black via-transparent to-black/20 opacity-80 transition-opacity duration-300 group-hover/quote:opacity-60" />
            <p className="relative max-w-145 text-[clamp(54px,6vw,96px)] font-black uppercase leading-[0.98] tracking-normal">
              Burnout<br />is not a badge<br />of honor
            </p>
          </div>
        </div>
      </div>
    </article>
  )
}
