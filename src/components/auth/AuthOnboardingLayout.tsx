import type { ReactNode } from "react"
import { Link } from "react-router"
import { AuthMarketingPanel } from "./AuthMarketingPanel"
import { CareConnectLogo } from "./CareConnectLogo"

type AuthOnboardingLayoutProps = {
  children: ReactNode
  showLogo?: boolean
  showFooter?: boolean
  className?: string
}

export function AuthOnboardingLayout({
  children,
  showLogo = true,
  showFooter = true,
  className = "",
}: AuthOnboardingLayoutProps) {
  return (
    <main className="min-h-screen gradient-bg text-[#151922] lg:flex">
      <AuthMarketingPanel />
      <section className="flex flex-1 min-h-screen p-4 lg:p-5">
        <div className="relative flex min-h-auto w-full flex-col overflow-hidden rounded-2xl bg-white lg:min-h-[calc(100vh-40px)]">
          {showLogo && (
            <header className="px-5 pt-6 sm:px-8">
              <CareConnectLogo />
            </header>
          )}
          <div className={`flex flex-1 flex-col ${className}`}>{children}</div>
          {showFooter && (
            <footer className="flex flex-wrap justify-center gap-6 px-5 pb-4 text-sm text-[#3b3f48] sm:justify-end sm:px-8">
              <Link to="#" className="hover:text-[#087fff]">
                Privacy policy
              </Link>
              <Link to="#" className="hover:text-[#087fff]">
                Terms &amp; Agreement
              </Link>
            </footer>
          )}
        </div>
      </section>
    </main>
  )
}
