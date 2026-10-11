import { Link } from "react-router"
import { ArrowLeft, CalendarDays, ClipboardList, MapPin, Stethoscope, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCareFlow } from "@/components/app/useCareFlow"
import { Routes } from "@/routes/constants"

/**
 * Telehealth, coming soon.
 *
 * Stands in for every Telehealth page — the Telehealth home, Schedule, Health Records,
 * records, follow-ups, and the agency's bookings and analytics — for every account type,
 * while the feature is paused. Nothing behind it has been deleted: the routes it replaces
 * are commented out in routes/index.tsx under "TELEHEALTH PAUSED", and putting them back
 * is uncommenting those lines.
 *
 * It promises no date, because there is none to give; it says what is coming and offers
 * the way home.
 */

const COMING = [
  { icon: Video, label: "Online consultations", hint: "See a professional by video, from wherever you are." },
  { icon: MapPin, label: "In-person visits", hint: "Book a professional to come to you." },
  { icon: CalendarDays, label: "Your schedule", hint: "Every appointment in one calendar." },
  { icon: ClipboardList, label: "Health records", hint: "Your health profile and visit notes, kept together." },
]

export default function TelehealthComingSoonPage() {
  const { flow } = useCareFlow()
  const home = flow === "agency" ? Routes.app.agency.dashboard : Routes.app.user.dashboard

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center p-5 sm:p-8">
      <section className="animate-fade-in-up w-full max-w-2xl overflow-hidden rounded-3xl border border-white/60 bg-white/90 text-center shadow-[0_24px_60px_-30px_rgba(16,20,26,0.35)] backdrop-blur-md">
        {/* The illustration: a stethoscope at the centre of a soft teal glow. */}
        <div className="relative bg-[radial-gradient(ellipse_at_50%_0%,#d3f2f2_0%,#eefbfb_45%,#ffffff_75%)] px-6 pb-6 pt-10 sm:pt-12">
          <span className="relative mx-auto flex size-28 items-center justify-center sm:size-32">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#00b4b8]/15 [animation-duration:2.6s]" aria-hidden="true" />
            <span className="absolute inset-3 rounded-full bg-[radial-gradient(circle_at_35%_30%,#5eead4,#00b4b8_55%,#00797c)] shadow-[0_18px_40px_-14px_rgba(0,137,140,0.7)]" aria-hidden="true" />
            <Stethoscope className="relative size-12 text-white sm:size-14" strokeWidth={1.8} aria-hidden="true" />
            <span className="absolute -right-1 top-3 flex size-10 items-center justify-center rounded-full bg-white shadow-md ring-4 ring-[#eefbfb]" aria-hidden="true">
              <Video className="size-5 text-[#00898c]" />
            </span>
          </span>

          <p className="mt-6 inline-flex items-center rounded-full bg-[#e3f8f8] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#00898c]">
            Coming soon
          </p>
          <h1 className="mt-3 text-2xl font-bold text-[#151922] sm:text-3xl">Telehealth is coming soon</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#657080] sm:text-base">
            We&apos;re putting the finishing touches to care that comes to you. Here&apos;s what
            Telehealth will bring to Care Connect.
          </p>
        </div>

        <ul className="cowry-stagger grid gap-3 px-6 pb-2 text-left sm:grid-cols-2">
          {COMING.map(({ icon: Icon, label, hint }) => (
            <li key={label} className="flex items-start gap-3 rounded-2xl border border-[#eef1f3] bg-[#fbfdfd] p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e3f8f8] text-[#00898c]">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[#151922]">{label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-[#657080]">{hint}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="px-6 pb-8 pt-5">
          <Button asChild className="rounded-full bg-[#00b4b8] px-6 text-white hover:opacity-90">
            <Link to={home}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to home
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
