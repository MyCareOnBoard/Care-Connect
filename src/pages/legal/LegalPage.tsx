import type { ReactNode } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import { ArrowLeft, FileWarning } from "lucide-react"
import { Routes } from "@/routes/constants"
import { cn } from "@/lib/utils"
import { CONSENT_VERSION } from "@/lib/consent"

/**
 * The frame every policy page shares: title, version, a contents list and the sections.
 *
 * `pendingReview` puts a notice at the top. The Privacy Policy and Terms are placeholders
 * whose wording comes from legal; until it does, the page says so plainly rather than
 * presenting draft text as the agreement.
 */
export interface LegalSection {
  id: string
  title: string
  body: ReactNode
}

const PAGES = [
  { to: Routes.legal.privacy, label: "Privacy Policy" },
  { to: Routes.legal.terms, label: "Terms of Service" },
  { to: Routes.legal.cookies, label: "Cookie Policy" },
]

export function LegalPage({
  title,
  intro,
  sections,
  pendingReview,
}: {
  title: string
  intro: ReactNode
  sections: LegalSection[]
  pendingReview?: boolean
}) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      <div className="max-w-3xl px-5 py-8 mx-auto sm:py-12">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(Routes.root))}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#00868a] hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </button>

        <nav aria-label="Policies" className="flex flex-wrap gap-2 mt-6">
          {PAGES.map((page) => (
            <Link
              key={page.to}
              to={page.to}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                pathname === page.to
                  ? "bg-[#10141a] text-white"
                  : "bg-white text-[#4a5260] ring-1 ring-[#e2e6ea] hover:ring-[#c8cdd4]",
              )}
            >
              {page.label}
            </Link>
          ))}
        </nav>

        <article className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-[#e2e6ea] sm:p-10">
          <h1 className="text-3xl font-bold tracking-tight text-[#141922]">{title}</h1>
          <p className="mt-2 text-xs text-[#8a94a3]">Version {CONSENT_VERSION}</p>

          {pendingReview && (
            <div className="mt-6 flex gap-3 rounded-2xl bg-[#fff6e6] p-4 text-sm text-[#7a5a1f] ring-1 ring-[#f3dfb5]">
              <FileWarning className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <p>
                <span className="font-bold">Pending legal review.</span> This page sets out what the final policy will
                cover. The full wording is being prepared and will replace this outline before launch.
              </p>
            </div>
          )}

          <div className="mt-6 text-sm leading-7 text-[#383d45]">{intro}</div>

          <nav aria-label="Contents" className="mt-8 rounded-2xl bg-[#f7fafb] p-4 ring-1 ring-[#eef1f3]">
            <p className="text-xs font-bold uppercase tracking-wide text-[#8a94a3]">Contents</p>
            <ol className="pl-5 mt-2 space-y-1 text-sm list-decimal">
              {sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="text-[#00868a] hover:underline">
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-8 space-y-8">
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} className="scroll-mt-6">
                <h2 className="text-lg font-bold text-[#141922]">
                  {index + 1}. {section.title}
                </h2>
                <div className="mt-2 space-y-3 text-sm leading-7 text-[#383d45]">{section.body}</div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  )
}

/** A clearly marked gap for legal to fill. */
export function ToBeProvided({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-[#e2c88f] bg-[#fffaf0] px-3 py-2 text-[#7a5a1f]">
      <span className="font-semibold">To be provided:</span> {children}
    </p>
  )
}
