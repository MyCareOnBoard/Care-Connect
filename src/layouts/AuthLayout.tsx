import { Outlet } from "react-router";
import { useEffect } from "react";

export default function AuthLayout() {
  useEffect(() => {
    document.body.classList.add('auth-layout-active')
    return () => document.body.classList.remove('auth-layout-active')
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-[440px]">
        <div className="bg-white/90 backdrop-blur-md border border-border rounded-[24px] shadow-[0_20px_60px_rgba(16,24,40,0.12)] px-6 sm:px-10 py-8 sm:py-10">
          <div className="flex flex-col gap-8 items-stretch justify-center">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
