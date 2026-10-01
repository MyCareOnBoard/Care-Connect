import { Link } from "react-router"
import { Sparkles } from "lucide-react"
import { Avatar } from "@/components/app/DashboardAvatar"
import { FollowButton } from "@/components/app/FollowButton"
import type { Connection } from "@/components/app/ConnectionsSection"
import type { ConnectionRelation } from "@/utils/careconnect/services/connectionsService"

/**
 * Suggested people or providers as cards — face, name, role, and why they are suggested.
 *
 * Cards rather than a list because a suggestion is a small decision: a bigger face and the
 * reason ("Also an ICU nurse") give enough to decide on without opening the profile.
 */
export function SuggestionGrid({
  title,
  items,
  actionLabel,
  activeLabel,
  relation,
  targetType,
  onFollowChange,
}: {
  title: string
  items: Connection[]
  actionLabel: string
  activeLabel: string
  relation: ConnectionRelation
  targetType: "individual" | "company"
  onFollowChange?: (uid: string, following: boolean) => void
}) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#151922]">
        <Sparkles className="size-4 text-[#00b4b8]" aria-hidden="true" />
        {title}
      </h2>
      <div className="cowry-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const face = (
            <Avatar
              className={`size-16 ${item.avatarClassName}`}
              initials={item.initials}
              src={item.photo}
              alt={item.name}
            />
          )
          return (
            <article
              key={item.uid ?? item.name}
              className="cowry-lift flex flex-col items-center rounded-2xl bg-white p-5 text-center ring-1 ring-[#e2e6ea]"
            >
              {item.profileHref ? <Link to={item.profileHref}>{face}</Link> : face}
              {item.profileHref ? (
                <Link to={item.profileHref} className="mt-3 max-w-full truncate font-bold text-[#151922] hover:underline">
                  {item.name}
                </Link>
              ) : (
                <p className="mt-3 max-w-full truncate font-bold text-[#151922]">{item.name}</p>
              )}
              <p className="mt-0.5 line-clamp-2 min-h-10 text-sm text-[#657080]">{item.subtitle}</p>
              {item.reason && (
                <p className="mt-2 rounded-full bg-[#e3f8f8] px-2.5 py-0.5 text-xs font-medium text-[#00898c]">{item.reason}</p>
              )}
              <div className="mt-4">
                <FollowButton
                  label={actionLabel}
                  activeLabel={activeLabel}
                  targetId={item.uid}
                  relation={relation}
                  targetType={targetType}
                  initialActive={item.isFollowing}
                  onChange={item.uid && onFollowChange ? (next) => onFollowChange(item.uid as string, next) : undefined}
                />
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
