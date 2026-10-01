import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { useLocation, useNavigate } from "react-router"
import { Briefcase, Building2, Clock, Loader2, Search, User, X } from "lucide-react"
import { Avatar } from "@/components/app/DashboardAvatar"
import { avatarColor } from "@/components/app/avatarColor"
import type { CareFlow } from "@/components/app/useCareFlow"
import { NavTooltip } from "@/components/app/NavTooltip"
import { cn, getInitials } from "@/lib/utils"
import { Routes } from "@/routes/constants"
import { listJobs } from "@/utils/careconnect/services/jobsService"
import { listProfiles } from "@/utils/careconnect/services/profilesService"
import type { CareConnectProfile, Job } from "@/utils/careconnect/types"

/**
 * Search from anywhere: people, providers and jobs.
 *
 * A search icon in the header opens a bar just under it; typing searches as you go. It uses
 * the `search` filter the profiles and jobs endpoints already have, asked in parallel —
 * there is no combined search endpoint yet, which would rank across all three properly.
 *
 * Keyboard: `/` or Ctrl/⌘+K opens it from anywhere, ↑ ↓ move through results, Enter opens
 * one, Esc closes. The last few searches are remembered in this browser.
 */

const MIN_CHARS = 2
const DEBOUNCE_MS = 250
const PER_GROUP = 5
const RECENT_KEY = "careconnect-recent-searches"
const RECENT_MAX = 5

interface ResultItem {
  key: string
  group: "People" | "Providers" | "Jobs"
  title: string
  subtitle: string
  href: string
  icon: ReactNode
}

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as string[]).slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}

function rememberSearch(term: string) {
  try {
    const next = [term, ...readRecent().filter((item) => item.toLowerCase() !== term.toLowerCase())]
    localStorage.setItem(RECENT_KEY, JSON.stringify(next.slice(0, RECENT_MAX)))
  } catch {
    // Not remembered; search still works.
  }
}

/** The part of `text` that matched, in bold. */
function Highlight({ text, term }: { text: string; term: string }) {
  const index = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1
  if (index < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-[#e3f8f8] px-0.5 font-bold text-inherit">{text.slice(index, index + term.length)}</mark>
      {text.slice(index + term.length)}
    </>
  )
}

function profileItem(profile: CareConnectProfile, group: "People" | "Providers", flow: CareFlow): ResultItem {
  const viewProfile = flow === "agency" ? Routes.app.agency.viewProfile : Routes.app.user.viewProfile
  return {
    key: `${group}-${profile.uid}`,
    group,
    title: profile.name || "Care Connect member",
    subtitle: profile.subtitle || profile.headline || profile.location || "",
    href: viewProfile(profile.uid),
    icon: (
      <Avatar
        className={cn("size-9 ring-0 shadow-none", avatarColor(profile.uid))}
        initials={getInitials(profile.name)}
        src={profile.photo}
      />
    ),
  }
}

function jobItem(job: Job): ResultItem {
  return {
    key: `job-${job.id}`,
    group: "Jobs",
    title: job.title,
    subtitle: [job.company, job.location].filter(Boolean).join(" · "),
    href: `${Routes.app.user.jobs}?job=${encodeURIComponent(job.id)}`,
    icon: (
      <span
        className={cn("flex size-9 items-center justify-center rounded-xl text-xs font-bold text-white", avatarColor(job.company))}
        aria-hidden="true"
      >
        {getInitials(job.company)}
      </span>
    ),
  }
}

const GROUP_ICONS = { People: User, Providers: Building2, Jobs: Briefcase }

export function GlobalSearch({ flow }: { flow: CareFlow }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState("")
  const [results, setResults] = useState<ResultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState("")
  const [active, setActive] = useState(0)
  const [recent, setRecent] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const latest = useRef(0)

  // Open from anywhere with "/" or Ctrl/⌘+K — unless already typing somewhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      if ((event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen(true)
      } else if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Leaving the page closes it.
  useEffect(() => {
    setOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!open) return
    setRecent(readRecent())
    const timer = setTimeout(() => inputRef.current?.focus(), 30)
    return () => clearTimeout(timer)
  }, [open])

  // Search as you type, a beat after the last keystroke. Only the newest answer is shown,
  // so a slow earlier request can never overwrite a newer one.
  useEffect(() => {
    const query = term.trim()
    if (query.length < MIN_CHARS) {
      setResults([])
      setLoading(false)
      setSearched("")
      return
    }
    setLoading(true)
    const id = (latest.current += 1)
    const timer = setTimeout(async () => {
      const [people, providers, jobs] = await Promise.allSettled([
        listProfiles({ type: "individual", search: query, limit: PER_GROUP }),
        listProfiles({ type: "company", search: query, limit: PER_GROUP }),
        // Job search is for members; agencies manage their own postings on the Jobs page.
        flow === "agency" ? Promise.resolve([] as Job[]) : listJobs({ search: query, limit: PER_GROUP }),
      ])
      if (id !== latest.current) return
      const next: ResultItem[] = [
        ...(people.status === "fulfilled" ? people.value.slice(0, PER_GROUP).map((p) => profileItem(p, "People", flow)) : []),
        ...(providers.status === "fulfilled" ? providers.value.slice(0, PER_GROUP).map((p) => profileItem(p, "Providers", flow)) : []),
        ...(jobs.status === "fulfilled" ? jobs.value.slice(0, PER_GROUP).map(jobItem) : []),
      ]
      setResults(next)
      setActive(0)
      setSearched(query)
      setLoading(false)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [term, flow])

  const groups = useMemo(() => {
    const byGroup = new Map<ResultItem["group"], ResultItem[]>()
    for (const item of results) byGroup.set(item.group, [...(byGroup.get(item.group) ?? []), item])
    return [...byGroup.entries()]
  }, [results])

  const close = () => {
    setOpen(false)
    setTerm("")
    setResults([])
  }

  const go = (item: ResultItem) => {
    rememberSearch(term.trim())
    close()
    navigate(item.href)
  }

  const onInputKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault()
      close()
    } else if (event.key === "ArrowDown" && results.length) {
      event.preventDefault()
      setActive((index) => (index + 1) % results.length)
    } else if (event.key === "ArrowUp" && results.length) {
      event.preventDefault()
      setActive((index) => (index - 1 + results.length) % results.length)
    } else if (event.key === "Enter" && results[active]) {
      event.preventDefault()
      go(results[active])
    }
  }

  const query = term.trim()

  return (
    <>
      <NavTooltip label="Search (/)">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search"
          aria-expanded={open}
          data-tour="search"
          className="group flex size-9 shrink-0 items-center justify-center rounded-full border-[3px] border-[#e8edef] bg-white text-[#151922] transition hover:border-[#00b4b8]/40 active:scale-90 sm:size-10"
        >
          <Search className="size-[18px] transition-transform group-hover:scale-110" aria-hidden="true" />
        </button>
      </NavTooltip>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Search">
            <button
              type="button"
              aria-label="Close search"
              onClick={close}
              className="animate-fadeIn absolute inset-0 bg-[#10141a]/30 backdrop-blur-[2px]"
            />

            <div className="animate-fade-in-up relative mx-auto mt-3 w-[min(40rem,calc(100vw-1.5rem))] overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_-20px_rgba(16,20,26,0.5)] ring-1 ring-[#e2e6ea] sm:mt-5">
              <div className="flex items-center gap-3 border-b border-[#eef1f3] px-4">
                {loading ? (
                  <Loader2 className="size-5 shrink-0 animate-spin text-[#00b4b8]" aria-hidden="true" />
                ) : (
                  <Search className="size-5 shrink-0 text-[#8a94a3]" aria-hidden="true" />
                )}
                <input
                  ref={inputRef}
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                  onKeyDown={onInputKey}
                  placeholder={flow === "agency" ? "Search people and providers" : "Search people, providers and jobs"}
                  aria-label="Search"
                  aria-autocomplete="list"
                  aria-controls="global-search-results"
                  aria-activedescendant={results[active] ? `search-${results[active].key}` : undefined}
                  className="h-14 min-w-0 flex-1 bg-transparent text-base text-[#151922] outline-none placeholder:text-[#9aa4b2]"
                />
                {term ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTerm("")
                      inputRef.current?.focus()
                    }}
                    aria-label="Clear search"
                    className="flex size-8 items-center justify-center rounded-full text-[#657080] transition hover:bg-[#f2f6f8]"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                ) : (
                  <kbd className="hidden rounded-md bg-[#eef1f3] px-2 py-0.5 text-[11px] font-semibold text-[#657080] sm:block">Esc</kbd>
                )}
              </div>

              <div id="global-search-results" role="listbox" className="max-h-[min(60vh,480px)] overflow-y-auto p-2">
                {query.length < MIN_CHARS ? (
                  recent.length > 0 ? (
                    <div className="p-2">
                      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-[#8a94a3]">Recent</p>
                      <div className="flex flex-wrap gap-2 px-2">
                        {recent.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setTerm(item)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#f2f6f8] px-3 py-1.5 text-sm text-[#383d45] transition hover:bg-[#e3f8f8] hover:text-[#00898c]"
                          >
                            <Clock className="size-3.5" aria-hidden="true" />
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="px-4 py-8 text-center text-sm text-[#657080]">
                      Search for a name, a care provider{flow === "agency" ? "" : " or a job title"}.
                    </p>
                  )
                ) : !loading && searched === query && results.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-[#657080]">
                    No results for &ldquo;{query}&rdquo;. Try a shorter or different word.
                  </p>
                ) : (
                  groups.map(([group, items]) => {
                    const GroupIcon = GROUP_ICONS[group]
                    return (
                      <div key={group} className="py-1">
                        <p className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-[#8a94a3]">
                          <GroupIcon className="size-3.5" aria-hidden="true" />
                          {group}
                        </p>
                        {items.map((item) => {
                          const index = results.indexOf(item)
                          const selected = index === active
                          return (
                            <button
                              key={item.key}
                              id={`search-${item.key}`}
                              type="button"
                              role="option"
                              aria-selected={selected}
                              onMouseEnter={() => setActive(index)}
                              onClick={() => go(item)}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors",
                                selected ? "bg-[#e3f8f8]" : "hover:bg-[#f7f9fb]",
                              )}
                            >
                              {item.icon}
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-[#151922]">
                                  <Highlight text={item.title} term={query} />
                                </span>
                                {item.subtitle && (
                                  <span className="block truncate text-xs text-[#657080]">{item.subtitle}</span>
                                )}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )
                  })
                )}
              </div>

              <div className="hidden items-center gap-4 border-t border-[#eef1f3] px-4 py-2 text-[11px] text-[#8a94a3] sm:flex">
                <span><kbd className="font-sans font-semibold">↑ ↓</kbd> to move</span>
                <span><kbd className="font-sans font-semibold">Enter</kbd> to open</span>
                <span><kbd className="font-sans font-semibold">Esc</kbd> to close</span>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
