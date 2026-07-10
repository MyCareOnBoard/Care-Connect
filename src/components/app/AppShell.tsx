import { useEffect, useState, type ReactNode } from "react"
import { Link, NavLink, useLocation } from "react-router"
import { Menu, X } from "lucide-react"
import { CareConnectLogo } from "@/components/auth/CareConnectLogo"
import { Routes } from "@/routes/constants"
import { cn } from "@/lib/utils"
import { useCareFlow } from "./useCareFlow"
import { AccountControls } from "./AccountControls"

const userNavItems = [
  { label: "Home", href: Routes.app.user.dashboard },
  { label: "Messages", href: Routes.app.user.messages },
  { label: "Jobs", href: Routes.app.user.jobs },
  { label: "Applications", href: Routes.app.user.applications },
  { label: "Market place", href: Routes.app.user.marketplace },
  { label: "Tele health", href: Routes.app.user.telehealth },
]

const agencyNavItems = [
  { label: "Home", href: Routes.app.agency.dashboard },
  { label: "Messages", href: Routes.app.agency.messages },
  { label: "Jobs", href: Routes.app.agency.jobs },
  { label: "Applications", href: Routes.app.agency.applications },
  { label: "Market place", href: Routes.app.agency.marketplace },
  { label: "Tele health", href: Routes.app.agency.telehealth },
]

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { flow } = useCareFlow()
  const navItems = flow === "agency" ? agencyNavItems : userNavItems
  const homeHref = flow === "agency" ? Routes.app.agency.dashboard : Routes.app.user.dashboard
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [location.pathname])

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
      <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-white/40 bg-white/70 px-4 py-3 shadow-[0_1px_0_rgba(16,20,26,0.06)] backdrop-blur-xl supports-backdrop-filter:bg-white/60 sm:min-h-18 sm:gap-5 sm:px-6 xl:px-8">
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open navigation menu"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#141922] transition hover:bg-[#f2f6f8] lg:hidden"
        >
          <Menu className="size-5" />
        </button>

        <Link to={homeHref} className="shrink-0">
          <CareConnectLogo />
        </Link>

        <nav className="mx-auto hidden max-w-full gap-2 overflow-x-auto px-2 lg:flex">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href

            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={cn(
                  "flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-5 text-sm font-medium transition",
                  isActive
                    ? "border-[#087fff] bg-[#087fff] text-white shadow-[0_4px_12px_rgba(8,127,255,0.22)]"
                    : "border-[#d8d8d8] bg-white text-[#141922] hover:border-[#087fff] hover:text-[#087fff]"
                )}
              >
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="ml-auto lg:ml-0">
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
            <div className="mb-4 flex items-center justify-between">
              <CareConnectLogo compact />
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
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex h-12 items-center rounded-xl px-4 text-base font-medium transition",
                    isActive ? "bg-[#087fff] text-white" : "text-[#141922] hover:bg-[#f2f6f8]"
                  )}
                >
                  {item.label}
                </NavLink>
              )
            })}
          </aside>
        </div>
      )}

      <section>
        {children}
      </section>
    </main>
  )
}
