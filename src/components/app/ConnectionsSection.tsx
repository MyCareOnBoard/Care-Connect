import { Link } from "react-router"
import { Avatar } from "@/components/app/DashboardAvatar"
import { FollowButton } from "@/components/app/FollowButton"
import { ViewAllLink } from "@/components/app/ViewAllLink"

export type Connection = {
  name: string
  subtitle: string
  initials: string
  avatarClassName: string
  profileHref?: string
}

type ConnectionsSectionProps = {
  title: string
  items: Connection[]
  actionLabel: string
  activeLabel: string
}

export function ConnectionsSection({ title, items, actionLabel, activeLabel }: ConnectionsSectionProps) {
  return (
    <section>
      <h2 className="mb-5 text-sm font-semibold">{title}</h2>
      <div className="space-y-4">
        {items.map((item, index) => (
          <div
            key={item.name}
            style={{ animationDelay: `${index * 80}ms` }}
            className="animate-fade-in-up -mx-2 flex items-center gap-3 rounded-xl px-2 py-1 transition-colors duration-200 hover:bg-white/70"
          >
            {item.profileHref ? (
              <Link to={item.profileHref} className="flex flex-1 min-w-0 items-center gap-3">
                <Avatar className={item.avatarClassName} initials={item.initials} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate hover:underline">{item.name}</p>
                  <p className="mt-1 truncate text-sm text-[#383d45]">{item.subtitle}</p>
                </div>
              </Link>
            ) : (
              <>
                <Avatar className={item.avatarClassName} initials={item.initials} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{item.name}</p>
                  <p className="mt-1 truncate text-sm text-[#383d45]">{item.subtitle}</p>
                </div>
              </>
            )}
            <FollowButton label={actionLabel} activeLabel={activeLabel} />
          </div>
        ))}
      </div>
      <ViewAllLink />
    </section>
  )
}
