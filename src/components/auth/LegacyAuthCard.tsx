import type { ReactNode } from "react"

export function LegacyAuthCard({ children }: { children: ReactNode }) {
  return (
    <main className="flex items-center justify-center min-h-screen px-4 py-8 overflow-y-scroll bg-background">
      <div className="w-full max-w-110 rounded-3xl border border-border bg-white/90 px-6 py-8 shadow-[0_20px_60px_rgba(16,24,40,0.12)] backdrop-blur-md sm:px-10 sm:py-10">
        {children}
      </div>
    </main>
  )
}
