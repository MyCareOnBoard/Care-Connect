import type { CSSProperties } from "react"
import { Avatar } from "@/components/app/DashboardAvatar"
import { Button } from "@/components/ui/button"
import { getInitials } from "@/lib/utils"

export function InvitationRow({
  person,
  onAccept,
  onDecline,
  style,
}: {
  person: { name: string; role: string; avatarBg: string }
  onAccept: () => void
  onDecline: () => void
  style?: CSSProperties
}) {
  return (
    <div
      style={style}
      className="animate-fade-in-up flex flex-col gap-3 rounded-xl border border-[#eef1f3] bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#00b4b8]/30 hover:shadow-[0_8px_20px_rgba(16,20,26,0.08)] sm:flex-row sm:items-center sm:gap-4"
    >
      <div className="flex min-w-0 items-center gap-4">
        <Avatar className={person.avatarBg} initials={getInitials(person.name)} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-[#151922]">{person.name}</p>
          <p className="mt-1 truncate text-sm text-[#657080]">{person.role}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:ml-auto sm:shrink-0">
        <Button
          type="button"
          variant="outline"
          onClick={onDecline}
          className="h-10 flex-1 rounded-full border-[#d9d9d9] px-5 text-[#151922] transition-transform duration-150 hover:scale-105 hover:bg-[#f2f6f8] active:scale-95 sm:flex-none"
        >
          Decline
        </Button>
        <Button
          type="button"
          onClick={onAccept}
          className="h-10 flex-1 rounded-full bg-[#00b4b8] px-5 text-white transition-transform duration-150 hover:scale-105 hover:opacity-90 active:scale-95 sm:flex-none"
        >
          Accept
        </Button>
      </div>
    </div>
  )
}
