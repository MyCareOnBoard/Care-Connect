import { Suspense, useEffect, useMemo, useState } from "react"
import { Link, NavLink, Outlet, useLocation, useSearchParams } from "react-router"
import { ChevronDown, LogOut, Menu, ShieldCheck, X } from "lucide-react"
import { CowryIcon } from "@/components/cowry/CowryIcon"
import { CareConnectLogo } from "@/components/auth/CareConnectLogo"
import { RouteLoader } from "@/components/ui/loader"
import { ScrollToTop } from "@/components/app/ScrollToTop"
import { ThemeMenuRow, ThemeToggle } from "@/components/app/ThemeToggle"
import {
  AdminNavContext,
  COWRY_TABS,
  type AdminNavValue,
  type CowryTabKey,
  type SectionBadge,
} from "@/components/admin/adminNav"
import { SoundMenuRow } from "@/components/app/SoundToggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Routes } from "@/routes/constants"
import { useAuth, useAuthUser } from "@/utils/auth"
import { setSoundEnabled, useSoundEnabled } from "@/lib/sound"
import { toggleTheme } from "@/lib/theme"
import { cn, getInitials } from "@/lib/utils"

/**
 * Shell for `/admin/*`.
 *
 * Deliberately not AppShell: the member shell carries a feed, messages, a call layer and a
 * Cowry wallet, none of which an operator account has. Reusing it would render navigation to
 * places this account cannot go. It does borrow the member header's manners, though — icons
 * with their names on hover, and an initials menu holding Dark mode, Sounds and Sign out —
 * so moving between the two does not feel like changing products.
 *
 * One nav entry today. It is a list rather than a bare header so adding the next console is
 * an entry here and nothing else.
 *
 * On phones and tablets the sections of a console live in a slide-out sidebar, as the
 * member app's pages do; from laptop width up the console shows them as its own tab bar.
 */

const NAV = [{ to: Routes.app.admin.cowry, label: "Cowry economy", icon: CowryNavIcon }]

function CowryNavIcon({ className }: { className?: string }) {
  return <CowryIcon size={18} className={className} />
}

export default function AdminLayout() {
  const { user } = useAuthUser()
  const { logout } = useAuth()
  const soundOn = useSoundEnabled()
  const name = user?.fullName || user?.email || "Operator"
  const initials = getInitials(user?.fullName || user?.email || "Operator")
  const location = useLocation()
  const [params] = useSearchParams()
  const [navOpen, setNavOpen] = useState(false)
  const [badges, setBadges] = useState<Partial<Record<CowryTabKey, SectionBadge>>>({})
  const nav = useMemo<AdminNavValue>(() => ({ openNav: () => setNavOpen(true), badges, setBadges }), [badges])

  // Choosing a section closes the sidebar; so does Esc.
  useEffect(() => setNavOpen(false), [location.pathname, location.search])
  useEffect(() => {
    if (!navOpen) return
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setNavOpen(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [navOpen])

  const onCowry = location.pathname === Routes.app.admin.cowry
  const activeSection = params.get("tab") ?? "pools"

  return (
    <AdminNavContext.Provider value={nav}>
    <div className="min-h-screen bg-[#f7f8fa]">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open the console menu"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#141922] transition hover:bg-[#f2f6f8] lg:hidden"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          {/* The member app's own mark and wordmark — just the mark on a phone, as there. */}
          <span className="flex shrink-0 items-center gap-2">
            <NavLink to={Routes.app.admin.cowry} aria-label="Care Connect operator home" className="shrink-0">
              <span className="sm:hidden">
                <CareConnectLogo compact />
              </span>
              <span className="hidden sm:block">
                <CareConnectLogo />
              </span>
            </NavLink>
            <span className="flex items-center gap-1 rounded-full bg-[#10141a] px-2 py-0.5 text-xs font-medium text-white">
              <ShieldCheck className="size-3" aria-hidden="true" />
              operator
            </span>
          </span>

          <nav className="flex min-w-0 gap-1" aria-label="Consoles">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                title={label}
                aria-label={label}
                className={({ isActive }) =>
                  `cowry-hover group relative flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    isActive ? "bg-[#00b3ad] text-white" : "text-[#4f4f4f] hover:bg-gray-100"
                  }`
                }
              >
                <Icon className="cowry-wobble" />
                {/* The name shows from tablet up; on a phone the icon carries it, named on hover. */}
                <span className="hidden md:inline">{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* One tap, as in the member header; the account menu carries the same switch. */}
          <ThemeToggle className="ml-auto" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Account menu for ${name}`}
                title={name}
                className="flex h-8 items-center gap-1 rounded-full pl-1 pr-2 outline-none transition hover:bg-[#edf3f5]"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-[#d3f2f2] text-xs font-bold tracking-wide text-[#00898c]">
                  {initials}
                </span>
                <ChevronDown className="size-4 text-[#4f4f4f]" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 overflow-hidden rounded-2xl border-[#dce2e6] bg-white p-0 shadow-lg">
              <div className="bg-[#f7fafb] px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-[#d3f2f2] text-sm font-bold text-[#00b4b8]">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{name}</p>
                    <p className="truncate text-xs text-[#656f80]">{user?.email ?? "Super admin"}</p>
                  </div>
                </div>
              </div>
              <div className="py-1">
                <DropdownMenuItem
                  onSelect={(event) => {
                    // Stay open, so the switch can be seen flipping.
                    event.preventDefault()
                    toggleTheme()
                  }}
                  className="mx-2 cursor-pointer rounded-lg px-3 py-2 text-sm hover:bg-[#edf3f5]"
                >
                  <ThemeMenuRow />
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    setSoundEnabled(!soundOn)
                  }}
                  className="mx-2 cursor-pointer rounded-lg px-3 py-2 text-sm hover:bg-[#edf3f5]"
                >
                  <SoundMenuRow />
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => logout()} variant="destructive" className="mx-2 mb-2 rounded-lg">
                <span className="flex items-center gap-2 px-3 py-2 text-sm">
                  <LogOut className="size-4" aria-hidden="true" />
                  Sign out
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close the console menu"
            onClick={() => setNavOpen(false)}
            className="animate-fadeIn absolute inset-0 bg-black/40"
          />
          <aside
            aria-label="Console sections"
            className="animate-slide-in-left relative z-10 flex h-full w-72 max-w-[80vw] flex-col gap-1 overflow-y-auto bg-white p-4 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <Link to={Routes.app.admin.cowry} aria-label="Care Connect operator home">
                <CareConnectLogo />
              </Link>
              <button
                type="button"
                onClick={() => setNavOpen(false)}
                aria-label="Close the console menu"
                className="flex size-9 items-center justify-center rounded-full text-[#141922] transition hover:bg-[#f2f6f8]"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            {NAV.map(({ to, label, icon: Icon }) => (
              <div key={to}>
                <NavLink
                  to={to}
                  className={cn(
                    "flex h-12 items-center gap-3 rounded-xl px-4 text-base font-medium transition",
                    location.pathname === to ? "bg-[#00b4b8] text-white" : "text-[#141922] hover:bg-[#f2f6f8]",
                  )}
                >
                  <Icon />
                  {label}
                </NavLink>

                {/* The console's sections, with what is waiting in each. */}
                {to === Routes.app.admin.cowry &&
                  COWRY_TABS.map(({ key, label: sectionLabel, icon: SectionIcon }) => {
                    const active = onCowry && activeSection === key
                    const badge = badges[key]
                    return (
                      <Link
                        key={key}
                        to={`${Routes.app.admin.cowry}?tab=${key}`}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "ml-4 mt-0.5 flex h-11 items-center gap-2.5 rounded-xl border-l-2 pl-4 pr-3 text-sm font-medium transition",
                          active ? "border-[#00b4b8] bg-[#e6f8f8] text-[#00898c]" : "border-[#eef1f3] text-[#657080] hover:bg-[#f2f6f8]",
                        )}
                      >
                        <SectionIcon className="size-4 shrink-0" aria-hidden="true" />
                        <span className="flex-1">{sectionLabel}</span>
                        {(badge?.dirty ?? 0) > 0 && (
                          <span className="size-2 rounded-full bg-amber-400" title="Unsaved changes" aria-label="Unsaved changes" />
                        )}
                        {(badge?.count ?? 0) > 0 && (
                          <span className="rounded-full bg-red-100 px-1.5 text-xs font-bold text-red-700">{badge?.count}</span>
                        )}
                      </Link>
                    )
                  })}
              </div>
            ))}
          </aside>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Suspense fallback={<RouteLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <ScrollToTop />
    </div>
    </AdminNavContext.Provider>
  )
}
