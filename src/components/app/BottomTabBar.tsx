import { useEffect } from "react"
import { NavLink, useLocation, useNavigate } from "react-router"
import { Briefcase, Home, MessageCircle, Plus, Users, type LucideIcon } from "lucide-react"
import { openComposer } from "@/components/app/composeEvent"
import type { CareFlow } from "@/components/app/useCareFlow"
import { cn } from "@/lib/utils"
import { Routes } from "@/routes/constants"

/**
 * The phone's bottom tab bar: Home, Network, Post, Messages, Jobs.
 *
 * On a phone the whole nav used to sit behind the ☰ menu — two taps to anywhere, and only
 * if you knew it was there. Every social app people use keeps its core places one thumb away
 * at the bottom; this is that. The full menu is still in ☰ for everything else.
 *
 * The raised + in the middle is the one action worth making prominent: posting. From the
 * home page it opens the composer in place; from anywhere else it goes home and opens it.
 *
 * While mounted it adds `has-bottom-nav` to <html>, which sets `--app-bottom-inset` on
 * phones. Anything pinned to the bottom of the screen adds that inset, so it sits above the
 * bar instead of underneath it.
 */

interface Tab {
  label: string
  href: string
  icon: LucideIcon
  /** Paths that count as this tab, beyond `href` itself. */
  also?: string[]
  badge?: number
}

export function BottomTabBar({ flow, unreadMessages }: { flow: CareFlow; unreadMessages: number }) {
  const location = useLocation()
  const navigate = useNavigate()
  const agency = flow === "agency"
  const home = agency ? Routes.app.agency.dashboard : Routes.app.user.dashboard

  useEffect(() => {
    const root = document.documentElement
    root.classList.add("has-bottom-nav")
    return () => root.classList.remove("has-bottom-nav")
  }, [])

  const left: Tab[] = [
    { label: "Home", href: home, icon: Home },
    { label: "Network", href: agency ? Routes.app.agency.network : Routes.app.user.network, icon: Users },
  ]
  const right: Tab[] = [
    {
      label: "Messages",
      href: agency ? Routes.app.agency.messages : Routes.app.user.messages,
      icon: MessageCircle,
      badge: unreadMessages,
    },
    {
      label: "Jobs",
      href: agency ? Routes.app.agency.jobs : Routes.app.user.jobs,
      icon: Briefcase,
      also: agency ? [] : [Routes.app.user.applications],
    },
  ]

  const isActive = (tab: Tab) =>
    location.pathname === tab.href ||
    (tab.href !== home && location.pathname.startsWith(`${tab.href}/`)) ||
    Boolean(tab.also?.includes(location.pathname))

  const post = () => {
    if (location.pathname === home) openComposer()
    else navigate(`${home}?compose=1`)
  }

  const renderTab = (tab: Tab) => {
    const active = isActive(tab)
    const Icon = tab.icon
    return (
      <NavLink
        key={tab.label}
        to={tab.href}
        aria-current={active ? "page" : undefined}
        className="group relative flex flex-1 flex-col items-center justify-center gap-0.5 pt-1.5 text-[11px] font-semibold"
      >
        {/* A short bar marks the current tab. */}
        <span
          className={cn(
            "absolute top-0 h-[3px] rounded-full bg-[#00b4b8] transition-all duration-300",
            active ? "w-8 opacity-100" : "w-0 opacity-0",
          )}
          aria-hidden="true"
        />
        <span className="relative">
          <Icon
            className={cn(
              "size-[22px] transition-all duration-200 group-active:scale-90",
              active ? "text-[#00b4b8]" : "text-[#657080]",
            )}
            fill={active ? "currentColor" : "none"}
            fillOpacity={active ? 0.15 : undefined}
            strokeWidth={active ? 2.3 : 2}
            aria-hidden="true"
          />
          {tab.badge ? (
            <span className="absolute -right-2 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-[#ff3e66] px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-white">
              {tab.badge > 9 ? "9+" : tab.badge}
            </span>
          ) : null}
        </span>
        <span className={active ? "text-[#00898c]" : "text-[#657080]"}>{tab.label}</span>
      </NavLink>
    )
  }

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e8edef] bg-white/92 shadow-[0_-8px_24px_-16px_rgba(16,20,26,0.25)] backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch px-2">
        {left.map(renderTab)}

        <div className="flex flex-1 items-start justify-center">
          <button
            type="button"
            onClick={post}
            aria-label="Create a post"
            data-tour="tabbar-post"
            className="group -mt-5 flex size-14 items-center justify-center rounded-full bg-linear-to-br from-[#00c7cb] to-[#0096a0] text-white shadow-[0_10px_24px_-8px_rgba(0,150,160,0.8)] ring-4 ring-white transition-transform duration-200 active:scale-90"
          >
            <Plus className="size-7 transition-transform duration-300 group-active:rotate-90" strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        {right.map(renderTab)}
      </div>
    </nav>
  )
}
