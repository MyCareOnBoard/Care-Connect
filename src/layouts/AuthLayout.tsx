import { Outlet } from "react-router";
import { Suspense, useEffect } from "react";
import { SignupWizardProvider } from "@/utils/auth/context/SignupWizardContext";
import { RouteLoader } from "@/components/ui/loader";
import { RouteProgressBar } from "@/components/app/RouteProgressBar";

export default function AuthLayout() {
  useEffect(() => {
    document.body.classList.add('auth-layout-active')
    return () => document.body.classList.remove('auth-layout-active')
  }, [])

  return (
    <SignupWizardProvider>
      <RouteProgressBar />
      <Suspense fallback={<RouteLoader />}>
        <Outlet />
      </Suspense>
    </SignupWizardProvider>
  )
}
