import { useEffect, useState, type ComponentType, type ReactNode } from "react"
import { Link, NavLink, useLocation } from "react-router"
import { Briefcase, ChevronDown, Home, Menu, MessageCircle, Stethoscope, Store, Users, X } from "lucide-react"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { CareConnectLogo } from "@/components/auth/CareConnectLogo"
import { Routes } from "@/routes/constants"
import { cn } from "@/lib/utils"
import { db } from "@/lib/firebase"
import { useAuthUser } from "@/utils/auth"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { isCowryPathEnabled } from "@/utils/careconnect/cowryPages"
import { CowryBalanceChip } from "@/components/cowry/CowryBalanceChip"
import { ThemeToggle } from "./ThemeToggle"
import { useCareFlow } from "./useCareFlow"
import { AccountControls } from "./AccountControls"
import { RouteProgressBar } from "./RouteProgressBar"
import { BottomTabBar } from "./BottomTabBar"
import { GlobalSearch } from "./GlobalSearch"
import { NavTooltip } from "./NavTooltip"
import { CowryIcon } from "@/components/cowry/CowryIcon"

type NavIcon = ComponentType<{ className?: string }>

type NavItem = {
  label: string
  href: string
  /** Shown alone in the desktop header, with `label` as its tooltip. */
  icon: NavIcon
  children?: { label: string; href: string }[]
}

/** The drawn cowry, sized like the lucide icons around it. */
function CowryNavIcon({ className }: { className?: string }) {
  return <CowryIcon size={22} className={className} />
}

// Related pages nest under one dropdown rather than each taking a top-level slot:
// Applications sits with the Jobs it applies to, and Schedule (bookings and
// appointments) and "My health" sit with Tele health. Only user/professional
// accounts have a health profile, so the agency nav keeps a flat Tele health.
const userNavItems: NavItem[] = [
  { label: "Home", href: Routes.app.user.dashboard, icon: Home },
  { label: "My network", href: Routes.app.user.network, icon: Users },
  { label: "Messages", href: Routes.app.user.messages, icon: MessageCircle },
  {
    label: "Jobs",
    href: Routes.app.user.jobs,
    icon: Briefcase,
    children: [
      { label: "Jobs", href: Routes.app.user.jobs },
      { label: "Applications", href: Routes.app.user.applications },
    ],
  },
  { label: "Market place", href: Routes.app.user.marketplace, icon: Store },
  {
    label: "Tele health",
    href: Routes.app.user.telehealth,
    icon: Stethoscope,
    children: [
      { label: "Tele health", href: Routes.app.user.telehealth },
      { label: "My Health Records", href: Routes.app.user.healthProfile },
      { label: "Schedule", href: Routes.app.user.schedule },
    ],
  },
  // The Cowry pages are switched on individually — see cowryPages.ts. A page that is off
  // loses its entry here and its route; the parent drops out entirely once nothing is
  // left under it, rather than opening an empty dropdown.
  ...cowryNavItem(),
]

/** Exported for its own test: the empty case and the parent href are easy to get wrong. */
export function cowryNavItem(): NavItem[] {
  const children = [
    { label: "Wallet", href: Routes.app.user.cowryWallet },
    { label: "Earn", href: Routes.app.user.cowryEarn },
    { label: "Redeem for data", href: Routes.app.user.cowryRedeem },
    { label: "Buy Cowries", href: Routes.app.user.cowryBuy },
    { label: "Creator earnings", href: Routes.app.user.cowryCreator },
    { label: "Cash out", href: Routes.app.user.cowryWithdraw },
    { label: "History", href: Routes.app.user.cowryHistory },
  ].filter((child) => isCowryPathEnabled(child.href))

  if (!children.length) return []

  // The parent points at the first page still standing, so clicking "Cowry" never lands
  // on a route that has been switched off.
  return [{ label: "Cowry", href: children[0].href, icon: CowryNavIcon, children }]
}

const agencyNavItems: NavItem[] = [
  { label: "Home", href: Routes.app.agency.dashboard, icon: Home },
  { label: "My network", href: Routes.app.agency.network, icon: Users },
  { label: "Messages", href: Routes.app.agency.messages, icon: MessageCircle },
  { label: "Jobs", href: Routes.app.agency.jobs, icon: Briefcase },
  { label: "Market place", href: Routes.app.agency.marketplace, icon: Store },
  { label: "Tele health", href: Routes.app.agency.telehealth, icon: Stethoscope },
]

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { flow } = useCareFlow()
  const navItems = flow === "agency" ? agencyNavItems : userNavItems
  const homeHref = flow === "agency" ? Routes.app.agency.dashboard : Routes.app.user.dashboard
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [location.pathname])

  // Live unread-message count for the Messages nav badge (Firestore onSnapshot).
  const { user } = useAuthUser()
  const uid = user?.uid
  useEffect(() => {
    if (!uid) return
    const q = query(collection(db, "careconnectConversations"), where("participantIds", "array-contains", uid))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const total = snapshot.docs.reduce((sum, doc) => {
          const unread = doc.data().unreadCount
          return sum + ((unread && unread[uid]) || 0)
        }, 0)
        setUnreadMessages(total)
      },
      () => undefined,
    )
    return () => unsubscribe()
  }, [uid])

  useEffect(() => {
    if (!isSidebarOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSidebarOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [isSidebarOpen])

  return (
    <main className="min-h-screen bg-[#f5f8fa] text-[#11151d]">
      <RouteProgressBar />
      <header className="sticky top-0 z-20 flex min-h-16 items-center gap-2 border-b border-white/40 bg-white/70 px-4 py-3 shadow-[0_1px_0_rgba(16,20,26,0.06)] backdrop-blur-xl supports-backdrop-filter:bg-white/60 sm:min-h-18 sm:gap-5 sm:px-6 xl:px-8">
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open navigation menu"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#141922] transition hover:bg-[#f2f6f8] lg:hidden"
        >
          <Menu className="size-5" />
        </button>

        {/* Mark only on phones: the full wordmark, the Cowry balance and the account
            controls do not fit side by side under ~640px, and the overflow pushed the
            whole page sideways. The slide-out menu carries the full wordmark. */}
        <Link to={homeHref} className="shrink-0" aria-label="Home">
          <span className="sm:hidden">
            <CareConnectLogo compact />
          </span>
          <span className="hidden sm:block">
            <CareConnectLogo />
          </span>
        </Link>

        {/* Icons only, with each name on hover or focus. A menu that holds several pages
            (Jobs, Tele health, Cowry) opens a dropdown that still lists them by name. */}
        <nav
          aria-label="Main"
          className="mx-auto hidden items-center gap-1 rounded-full bg-white/70 p-1 shadow-[0_2px_10px_-4px_rgba(16,20,26,0.12)] ring-1 ring-[#e8edef] lg:flex"
        >
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = item.children
              ? item.children.some((child) => location.pathname === child.href)
              : location.pathname === item.href
            const buttonClass = cn(
              "group relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all duration-200 active:scale-90",
              isActive
                ? "bg-[#00b4b8] text-white shadow-[0_6px_16px_-6px_rgba(0,180,184,0.7)]"
                : "text-[#4a5260] hover:bg-[#e3f8f8] hover:text-[#00898c]",
            )
            const iconClass = cn(
              "size-[22px] transition-transform duration-200",
              !isActive && "group-hover:scale-110",
              item.icon === CowryNavIcon && "cowry-wobble",
            )

            if (item.children) {
              return (
                <DropdownMenu key={item.href}>
                  <NavTooltip label={item.label}>
                    <DropdownMenuTrigger asChild>
                      <button type="button" aria-label={item.label} className={cn(buttonClass, "cowry-hover")}>
                        <Icon className={iconClass} />
                        {/* A small chevron badge: this one opens a menu. */}
                        <ChevronDown
                          className={cn(
                            "absolute bottom-1 right-1 size-3 rounded-full p-px",
                            isActive ? "bg-white/25 text-white" : "bg-white text-[#8a94a3] ring-1 ring-[#e8edef]",
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    </DropdownMenuTrigger>
                  </NavTooltip>
                  <DropdownMenuContent align="center" sideOffset={8} className="min-w-48 rounded-xl border-[#eef1f3] bg-white p-1.5">
                    <p className="flex items-center gap-2 px-2 pb-1.5 pt-1 text-xs font-semibold uppercase tracking-wide text-[#8a94a3]">
                      <Icon className="size-4" />
                      {item.label}
                    </p>
                    {item.children.map((child) => {
                      const childActive = location.pathname === child.href
                      return (
                        <DropdownMenuItem
                          key={child.href}
                          asChild
                          className={cn(
                            "rounded-lg data-highlighted:bg-[#e3f8f8] data-highlighted:text-[#00898c]",
                            childActive && "bg-[#e3f8f8] font-semibold text-[#00898c]"
                          )}
                        >
                          <Link to={child.href}>{child.label}</Link>
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            }

            return (
              <NavTooltip key={item.href} label={item.label}>
                <NavLink to={item.href} aria-label={item.label} className={buttonClass}>
                  <Icon className={iconClass} />
                  {item.label === "Messages" && unreadMessages > 0 && (
                    <span
                      className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-[#ff3e66] px-1 text-[10px] font-bold leading-5 text-white ring-2 ring-white"
                      aria-label={`${unreadMessages} unread`}
                    >
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </NavLink>
              </NavTooltip>
            )
          })}
        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2 lg:ml-0">
          {/* Agencies have no Cowry wallet, so the balance is a member-only fixture. */}
          {/* On phones the header has no room to spare; the switch lives in the account menu. */}
          <GlobalSearch flow={flow} />
          <ThemeToggle className="hidden sm:flex" />
          {flow !== "agency" && <CowryBalanceChip />}
          <AccountControls flow={flow} />
        </div>
      </header>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setIsSidebarOpen(false)}
            className="absolute inset-0 bg-black/40 animate-fadeIn"
          />
          <aside className="animate-slide-in-left relative z-10 flex h-full w-72 max-w-[80vw] flex-col gap-1 overflow-y-auto bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              {/* The full wordmark lives here on phones, where the header only has room
                  for the mark. */}
              <Link to={homeHref} aria-label="Home">
                <CareConnectLogo />
              </Link>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                aria-label="Close navigation menu"
                className="flex size-9 items-center justify-center rounded-full text-[#141922] transition hover:bg-[#f2f6f8]"
              >
                <X className="size-5" />
              </button>
            </div>

            {navItems.map((item) => {
              const isActive = location.pathname === item.href

              return (
                <div key={item.href}>
                  <NavLink
                    to={item.href}
                    className={cn(
                      "flex h-12 items-center rounded-xl px-4 text-base font-medium transition",
                      isActive ? "bg-[#00b4b8] text-white" : "text-[#141922] hover:bg-[#f2f6f8]"
                    )}
                  >
                    <item.icon className="mr-3 size-5 shrink-0" />
                    {item.label}
                    {item.label === "Messages" && unreadMessages > 0 && (
                      <span className={cn(
                        "ml-2 flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                        isActive ? "bg-white text-[#00b4b8]" : "bg-[#00b4b8] text-white"
                      )}>
                        {unreadMessages}
                      </span>
                    )}
                  </NavLink>
                  {item.children
                    ?.filter((child) => child.href !== item.href)
                    .map((child) => (
                      <NavLink
                        key={child.href}
                        to={child.href}
                        className={cn(
                          "ml-4 flex h-11 items-center rounded-xl border-l-2 border-[#eef1f3] pl-4 text-sm font-medium transition",
                          location.pathname === child.href ? "border-[#00b4b8] text-[#00b4b8]" : "text-[#657080] hover:bg-[#f2f6f8]"
                        )}
                      >
                        {child.label}
                      </NavLink>
                    ))}
                </div>
              )
            })}
          </aside>
        </div>
      )}

      <section className="pb-(--app-bottom-inset)">
        {children}
      </section>
      <BottomTabBar flow={flow} unreadMessages={unreadMessages} />
    </main>
  )
}
