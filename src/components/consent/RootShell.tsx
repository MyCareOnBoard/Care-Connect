import { Suspense } from "react"
import { Outlet } from "react-router"
import { PageLoader } from "@/components/ui/loader"
import { CookieConsent } from "@/components/consent/CookieConsent"

/** The outermost route: whatever page is showing, with the cookie banner over it. */
export function RootShell() {
  return (
    <>
      <Suspense fallback={<PageLoader text="Loading..." />}>
        <Outlet />
      </Suspense>
      <CookieConsent />
    </>
  )
}
