import { Link } from "react-router"
import { Avatar } from "@/components/app/DashboardAvatar"
import { Button } from "@/components/ui/button"

export function NetworkConnectionRow({
  name,
  subtitle,
  initials,
  avatarClassName,
  profileHref,
  dateLabel,
  messageHref,
  removeLabel,
  onRemove,
  removing,
}: {
  name: string
  subtitle: string
  initials: string
  avatarClassName: string
  profileHref?: string
  dateLabel: string
  messageHref: string
  /** "Remove" (connections) or "Unsubscribe" (agencies). */
  removeLabel: string
  onRemove: () => void
  removing?: boolean
}) {
  const nameBlock = <p className="truncate font-bold text-[#151922] hover:underline">{name}</p>

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#eef1f3] p-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 items-center gap-4">
        {profileHref ? (
          <Link to={profileHref} className="shrink-0">
            <Avatar className={avatarClassName} initials={initials} />
          </Link>
        ) : (
          <Avatar className={avatarClassName} initials={initials} />
        )}
        <div className="min-w-0 flex-1">
          {profileHref ? <Link to={profileHref}>{nameBlock}</Link> : nameBlock}
          <p className="mt-1 truncate text-sm text-[#657080]">{subtitle}</p>
          <p className="mt-1 text-xs text-[#8a8f98]">{dateLabel}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:ml-auto sm:shrink-0">
        <Button
          asChild
          variant="outline"
          className="h-10 flex-1 rounded-full border-[#00b4b8] px-5 text-[#00b4b8] hover:bg-[#e3f8f8] sm:flex-none"
        >
          <Link to={messageHref}>Message</Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={removing}
          onClick={onRemove}
          className="h-10 flex-1 rounded-full border-[#d9d9d9] px-5 text-[#151922] hover:bg-[#f2f6f8] sm:flex-none"
        >
          {removeLabel}
        </Button>
      </div>
    </div>
  )
}
