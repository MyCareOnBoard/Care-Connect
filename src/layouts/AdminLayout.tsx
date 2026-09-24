import { Suspense } from "react"
import { NavLink, Outlet } from "react-router"
import { LogOut } from "lucide-react"
import { CowryIcon } from "@/components/cowry/CowryIcon"
import { RouteLoader } from "@/components/ui/loader"
import { Routes } from "@/routes/constants"
import { useAuth, useAuthUser } from "@/utils/auth"

/**
 * Shell for `/admin/*`.
 *
 * Deliberately not AppShell: the member shell carries a feed, messages, a call layer and a
 * Cowry wallet, none of which an operator account has. Reusing it would render navigation to
 * places this account cannot go.
 *
 * One nav entry today. It is a list rather than a bare header so adding the next console is
 * an entry here and nothing else.
 */

const NAV = [{ to: Routes.app.admin.cowry, label: "Cowry economy", icon: CowryNavIcon }]

function CowryNavIcon({ className }: { className?: string }) {
  return <CowryIcon size={18} className={className} />
}

export default function AdminLayout() {
  const { user } = useAuthUser()
  const { logout } = useAuth()

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
          <span className="text-sm font-semibold tracking-tight text-[#10141a]">
            Care Connect
            <span className="ml-2 rounded-full bg-[#10141a] px-2 py-0.5 text-xs font-medium text-white">
              operator
            </span>
          </span>

          <nav className="flex flex-wrap gap-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `cowry-hover flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-[#00b3ad] text-white"
                      : "text-[#4f4f4f] hover:bg-gray-100"
                  }`
                }
              >
                <Icon className="cowry-wobble" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {user?.email && (
              <span className="hidden text-xs text-[#6b7280] sm:inline">{user.email}</span>
            )}
            <button
              type="button"
              onClick={() => logout()}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-sm text-[#4f4f4f] transition hover:border-gray-300"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Suspense fallback={<RouteLoader />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
