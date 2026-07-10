import { useRef, useState, type ReactNode } from "react"
import { Link } from "react-router"
import { AuthMarketingPanel } from "./AuthMarketingPanel"
import { CareConnectLogo } from "./CareConnectLogo"

type AuthOnboardingLayoutProps = {
  children: ReactNode
  header?: ReactNode
  showLogo?: boolean
  showFooter?: boolean
  className?: string
}

export function AuthOnboardingLayout({
  children,
  header,
  showLogo = true,
  showFooter = true,
  className = "",
}: AuthOnboardingLayoutProps) {
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleScroll = () => {
    setIsScrolling(true)
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
    scrollTimeout.current = setTimeout(() => setIsScrolling(false), 800)
  }

  return (
    <main className="h-screen overflow-hidden gradient-bg text-[#151922] lg:flex">
      <AuthMarketingPanel />
      <section className="flex flex-1 h-full p-4 lg:p-5">
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white">
          {showLogo && (
            <header className="px-5 pt-6 sm:px-8">
              <CareConnectLogo />
            </header>
          )}
          {header}
          <div
            onScroll={handleScroll}
            className={`auto-hide-scrollbar flex flex-1 flex-col min-h-0 overflow-y-auto ${isScrolling ? "is-scrolling" : ""} ${className}`}
          >
            {children}
          </div>
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
