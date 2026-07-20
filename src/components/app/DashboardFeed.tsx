import { useEffect, useState } from "react"
import { PortfolioPost, type PortfolioPostData, type PostComment } from "@/components/profile/PortfolioPost"
import { FollowButton } from "@/components/app/FollowButton"
import { Skeleton } from "@/components/ui/skeleton"
import { useCareFlow } from "@/components/app/useCareFlow"
import { Routes } from "@/routes/constants"
import { getInitials } from "@/lib/utils"
import {
  addComment,
  likePost,
  listComments,
  listFeed,
  unlikePost,
  POST_CREATED_EVENT,
  type FeedPost,
} from "@/utils/careconnect/services/postsService"
import { listConnections } from "@/utils/careconnect/services/connectionsService"

const AVATAR_PALETTE = ["bg-[#087fff]", "bg-[#ffa33d]", "bg-[#a782d8]", "bg-[#d193ce]", "bg-[#ffc95c]"]

/** Map a backend feed post into the presentational PortfolioPostData shape. */
function toPortfolioData(post: FeedPost): PortfolioPostData {
  return {
    id: post.id,
    paragraphs: post.paragraphs ?? [],
    hashtags: post.hashtags,
    statement: post.statement,
    likes: post.likesCount ?? 0,
    comments: [],
  }
}

export function DashboardFeed() {
  const { flow } = useCareFlow()
  const viewProfile = flow === "agency" ? Routes.app.agency.viewProfile : Routes.app.user.viewProfile
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [followed, setFollowed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const [feed, connections] = await Promise.all([listFeed(), listConnections().catch(() => [])])
        if (!active) return
        setPosts(feed)
        setFollowed(new Set(connections.map((connection) => connection.targetId)))
      } catch {
        // feed is non-critical; leave empty on failure
      } finally {
        if (active) setLoading(false)
      }
    }
    load()

    // A new post from the composer (either dashboard) prepends live.
    const onCreated = (event: Event) => {
      const post = (event as CustomEvent<FeedPost>).detail
      if (post) setPosts((current) => [post, ...current])
    }
    window.addEventListener(POST_CREATED_EVENT, onCreated)
    return () => {
      active = false
      window.removeEventListener(POST_CREATED_EVENT, onCreated)
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#e2e2e2] p-10 text-center text-sm text-[#657080]">
        No posts yet. Share the first highlight above.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {posts.map((post, index) => (
        <PortfolioPost
          key={post.id}
          authorName={post.authorName || "Care Connect user"}
          authorRole={post.authorRole || ""}
          avatarClassName={AVATAR_PALETTE[index % AVATAR_PALETTE.length]}
          initials={getInitials(post.authorName)}
          authorHref={viewProfile(post.authorId)}
          post={toPortfolioData(post)}
          initialLiked={post.likedByMe}
          initialCommentCount={post.commentsCount ?? 0}
          onLikeChange={(next) => {
            const call = next ? likePost : unlikePost
            call(post.id).catch(() => undefined)
          }}
          onSubmitComment={(text) => {
            addComment(post.id, text).catch(() => undefined)
          }}
          onLoadComments={async (): Promise<PostComment[]> => {
            const comments = await listComments(post.id)
            return comments.map((c) => ({ id: c.id, author: c.author, text: c.text }))
          }}
          action={<FollowButton label="Connect" activeLabel="Pending" targetId={post.authorId} relation="connect" initialActive={followed.has(post.authorId)} />}
        />
      ))}
    </div>
  )
}
