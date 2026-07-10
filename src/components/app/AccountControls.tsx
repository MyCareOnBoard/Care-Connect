import { Link, useNavigate } from "react-router"
import { Bell, ChevronDown, LogOut, Settings, UserRound } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Routes } from "@/routes/constants"
import { useAuth } from "@/utils/auth"
import type { CareFlow } from "./useCareFlow"

type AccountControlsProps = {
  flow?: CareFlow
  notificationSize?: "md" | "lg"
}

export function AccountControls({ flow = "user", notificationSize = "md" }: AccountControlsProps) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const profilePath = flow === "agency" ? Routes.app.agency.profile : Routes.app.user.profile
  const settingsPath = flow === "agency" ? Routes.app.agency.settings : Routes.app.user.settings
  const notificationButtonSize = notificationSize === "lg" ? "size-11" : "size-10"

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate(Routes.auth.login, { replace: true })
    }
  }

  return (
    <div className="flex w-fit items-center rounded-full border-[3px] border-[#e8edef] bg-[#f7fafb] p-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Notifications"
            className={`relative flex ${notificationButtonSize} items-center justify-center rounded-full bg-white text-[#151922] outline-none transition hover:bg-[#f2f6f8] cursor-pointer`}
          >
            <Bell className="size-5 fill-[#151922]" />
            <span className="absolute right-3 top-2 size-2 rounded-full bg-[#ed2f20]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-xl border-[#dce2e6] bg-white p-3">
          <DropdownMenuLabel className="px-1 text-sm font-semibold">Notifications</DropdownMenuLabel>
          <div className="px-1 py-5 text-center text-sm text-[#737780]">No notifications</div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Link
        to={profilePath}
        aria-label="Profile image"
        className="ml-1 flex size-9 items-center justify-center rounded-full bg-[#d6e6f2] transition hover:ring-2 hover:ring-[#087fff]/30"
      >
        <span className="size-5 rounded-full bg-[#6b9cca]" />
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-6 items-center gap-3 rounded-full pl-2 pr-3 outline-none transition hover:bg-[#edf3f5] cursor-pointer"
          >
            <span className="hidden text-sm font-medium sm:inline">Joseph Eshun</span>
            <ChevronDown className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 rounded-xl border-[#dce2e6] bg-white p-1">
          <DropdownMenuItem asChild className="rounded-lg hover:bg-[#edf3f5] cursor-pointer">
            <Link to={profilePath}>
              <UserRound className="size-4" />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="rounded-lg hover:bg-[#edf3f5] cursor-pointer">
            <Link to={settingsPath}>
              <Settings className="size-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleLogout} variant="destructive" className="rounded-lg hover:bg-[#ff313157] cursor-pointer">
            <LogOut className="size-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
