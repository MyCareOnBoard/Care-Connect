import type { ReactNode } from "react"
import { Link, NavLink, useLocation } from "react-router"
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

  return (
    <main className="min-h-screen bg-white text-[#11151d]">
      <header className="sticky top-0 z-20 flex items-center gap-5 px-6 py-3 bg-white border-b border-transparent min-h-18 xl:px-8">
        <Link to={flow === "agency" ? Routes.app.agency.dashboard : Routes.app.user.dashboard} className="shrink-0">
          <CareConnectLogo />
        </Link>

        <nav className="flex max-w-full gap-2 px-2 mx-auto overflow-x-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href

            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={cn(
                  "flex h-10 shrink-0 items-center justify-center rounded-full border px-5 text-sm font-medium transition",
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

        <AccountControls flow={flow} />
      </header>

      <section>
        {children}
      </section>
    </main>
  )
}
