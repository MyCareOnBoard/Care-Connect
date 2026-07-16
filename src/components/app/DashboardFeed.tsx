import { PortfolioPost } from "@/components/profile/PortfolioPost"
import { FollowButton } from "@/components/app/FollowButton"
import { useCareFlow } from "@/components/app/useCareFlow"
import { Routes } from "@/routes/constants"
import { getProfessionalProfile } from "@/data/professionals"

const FEED_AUTHOR_IDS = ["sarah-mitchell", "jerome-bell", "esther-howard"]

export function DashboardFeed() {
  const { flow } = useCareFlow()
  const viewProfile = flow === "agency" ? Routes.app.agency.viewProfile : Routes.app.user.viewProfile

  const feedAuthors = FEED_AUTHOR_IDS.map((id) => getProfessionalProfile(id)).filter((author) => author.portfolio.length > 0)

  return (
    <div className="space-y-6">
      {feedAuthors.map((author) => (
        <PortfolioPost
          key={author.id}
          authorName={author.name}
          authorRole={author.headline}
          avatarClassName={author.avatarClassName}
          initials={author.initials}
          authorHref={viewProfile(author.id)}
          post={author.portfolio[0]}
          action={<FollowButton label="Connect" activeLabel="Pending" />}
        />
      ))}
    </div>
  )
}
