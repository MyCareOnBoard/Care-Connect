import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import { Briefcase, Gift, PenLine, Users } from "lucide-react"
import { PortfolioPost, type PostComment } from "@/components/profile/PortfolioPost"
import { toPortfolioData } from "@/components/profile/postMapping"
import { FollowButton } from "@/components/app/FollowButton"
import { Avatar } from "@/components/app/DashboardAvatar"
import { avatarColor } from "@/components/app/avatarColor"
import { openComposer } from "@/components/app/composeEvent"
import { GiftTray } from "@/components/cowry/GiftTray"
import { Skeleton } from "@/components/ui/skeleton"
import { useCareFlow, type CareFlow } from "@/components/app/useCareFlow"
import { Routes } from "@/routes/constants"
import { cn, getInitials } from "@/lib/utils"
import { useAuthUser } from "@/utils/auth"
import { isAnyCowryPageEnabled } from "@/utils/careconnect/cowryPages"
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

/** How many faces the "in your feed" row shows before it stops. */
const STORY_LIMIT = 12

interface GiftTarget {
  postId: string
  authorId: string
  authorName: string
}

/** Placeholder cards shaped like a post, so loading does not jump when posts arrive. */
function FeedSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1].map((key) => (
        <div key={key} className="rounded-2xl bg-white/80 p-5 ring-1 ring-white/60">
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
          <Skeleton className="mt-4 h-56 w-full rounded-xl" />
        </div>
      ))}
    </div>
  )
}

/**
 * The people behind the posts, as a row of faces.
 *
 * Built from the feed already loaded rather than a separate "who posted recently" query —
 * there isn't one yet — so every face here genuinely has a post below. Tapping a face
 * scrolls to that person's latest post and flashes it.
 */
function FeedFaces({ posts, myUid }: { posts: FeedPost[]; myUid?: string }) {
  const authors = useMemo(() => {
    const seen = new Map<string, FeedPost>()
    for (const post of posts) {
      if (!post.authorId || post.authorId === myUid || seen.has(post.authorId)) continue
      seen.set(post.authorId, post)
      if (seen.size >= STORY_LIMIT) break
    }
    return [...seen.values()]
  }, [posts, myUid])

  if (authors.length < 2) return null

  function jumpTo(postId: string) {
    const element = document.getElementById(`post-${postId}`)
    if (!element) return
    element.scrollIntoView({ behavior: "smooth", block: "center" })
    element.classList.remove("feed-flash")
    // Restart the flash if the same face is tapped twice.
    void element.offsetWidth
    element.classList.add("feed-flash")
  }

  return (
    <section aria-label="People in your feed" className="rounded-2xl bg-white/85 p-4 shadow-[0_4px_20px_rgba(16,20,26,0.05)] ring-1 ring-white/60 backdrop-blur-md">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#8a94a3]">In your feed</h2>
      <div className="scrollbar-hide -mx-1 flex gap-4 overflow-x-auto px-1 pb-1">
        {authors.map((post, index) => {
          const firstName = (post.authorName || "Member").split(" ")[0]
          return (
            <button
              key={post.authorId}
              type="button"
              onClick={() => jumpTo(post.id)}
              className="animate-fade-in-up group flex w-16 shrink-0 flex-col items-center gap-1.5"
              style={{ animationDelay: `${index * 50}ms` }}
              aria-label={`Go to ${post.authorName || "this member"}'s post`}
            >
              <span className="relative flex size-16 items-center justify-center">
                <span
                  className="animate-story-ring absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#00b4b8,#ffc95c,#ff7aa8,#a782d8,#00b4b8)]"
                  aria-hidden="true"
                />
                <span className="absolute inset-[3px] rounded-full bg-white" aria-hidden="true" />
                <Avatar
                  className={cn("relative size-[54px] ring-0 shadow-none transition-transform group-hover:scale-105 group-active:scale-95", avatarColor(post.authorId))}
                  initials={getInitials(post.authorName)}
                  src={post.authorPhoto}
                />
              </span>
              <span className="w-full truncate text-center text-xs font-medium text-[#383d45]">{firstName}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

/** An empty feed is a first visit, most of the time. Give it somewhere to go. */
function EmptyFeed({ flow }: { flow: CareFlow }) {
  const starters = [
    {
      icon: PenLine,
      title: "Introduce yourself",
      body: "Say who you are and what you do.",
      tint: "bg-[#e6f8f8] text-[#00898c]",
      onClick: () =>
        openComposer({ text: "Hi everyone 👋 I'm new here. A little about me: " }),
    },
    {
      icon: Users,
      title: "Find your people",
      body: "Follow professionals and providers.",
      tint: "bg-[#f1e8ff] text-[#7a4fd1]",
      to: flow === "agency" ? Routes.app.agency.network : Routes.app.user.network,
    },
    {
      icon: Briefcase,
      title: flow === "agency" ? "Post a job" : "Browse jobs",
      body: flow === "agency" ? "Reach care professionals." : "See roles that fit you.",
      tint: "bg-[#fff4df] text-[#c8963e]",
      to: flow === "agency" ? Routes.app.agency.jobs : Routes.app.user.jobs,
    },
  ]

  return (
    <div className="animate-fade-in-up rounded-2xl bg-white/85 p-8 text-center shadow-[0_4px_20px_rgba(16,20,26,0.05)] ring-1 ring-white/60">
      <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#e6f8f8,#f1e8ff)]">
        <span className="animate-float-soft text-3xl" aria-hidden="true">✨</span>
      </div>
      <h2 className="mt-4 text-lg font-bold text-[#151922]">Your feed starts here</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-[#657080]">
        Posts from people and providers you follow will show up here. Here&apos;s a good place
        to start.
      </p>
      <div className="cowry-stagger mt-6 grid gap-3 text-left sm:grid-cols-3">
        {starters.map(({ icon: Icon, title, body, tint, to, onClick }) => {
          const content = (
            <>
              <span className={cn("flex size-10 items-center justify-center rounded-2xl", tint)}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="mt-3 block text-sm font-semibold text-[#151922]">{title}</span>
              <span className="mt-0.5 block text-xs text-[#657080]">{body}</span>
            </>
          )
          const className =
            "cowry-lift cowry-press block rounded-2xl bg-white p-4 ring-1 ring-[#e8edf0] transition hover:ring-[#00b4b8]/40"
          return to ? (
            <Link key={title} to={to} className={className}>
              {content}
            </Link>
          ) : (
            <button key={title} type="button" onClick={onClick} className={cn(className, "w-full text-left")}>
              {content}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function DashboardFeed() {
  const { flow } = useCareFlow()
  const { user } = useAuthUser()
  const myUid = user?.uid
  const viewProfile = flow === "agency" ? Routes.app.agency.viewProfile : Routes.app.user.viewProfile
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [followed, setFollowed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [giftTarget, setGiftTarget] = useState<GiftTarget | null>(null)

  // Gifts are a member feature and only exist while some Cowry page is switched on.
  const canGift = flow !== "agency" && isAnyCowryPageEnabled()

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

  if (loading) return <FeedSkeleton />

  if (posts.length === 0) return <EmptyFeed flow={flow} />

  return (
    <div className="space-y-6">
      <FeedFaces posts={posts} myUid={myUid} />

      {posts.map((post, index) => {
        const mine = post.authorId === myUid
        return (
          <div
            key={post.id}
            id={`post-${post.id}`}
            className="animate-fade-in-up scroll-mt-28 rounded-2xl"
            // Only the first screenful staggers; later posts should not wait to appear.
            style={index < 6 ? { animationDelay: `${index * 70}ms` } : undefined}
          >
            <PortfolioPost
              authorName={post.authorName || "Care Connect user"}
              authorRole={post.authorRole || ""}
              avatarClassName={avatarColor(post.authorId)}
              initials={getInitials(post.authorName)}
              authorPhoto={post.authorPhoto}
              createdAt={post.createdAt}
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
              action={
                mine ? undefined : (
                  <FollowButton label="Connect" activeLabel="Pending" targetId={post.authorId} relation="connect" initialActive={followed.has(post.authorId)} />
                )
              }
              footerAction={
                canGift && !mine ? (
                  <button
                    type="button"
                    onClick={() =>
                      setGiftTarget({
                        postId: post.id,
                        authorId: post.authorId,
                        authorName: post.authorName || "this member",
                      })
                    }
                    className="cowry-hover inline-flex items-center gap-1.5 rounded-full border border-[#f3e6c8] bg-[linear-gradient(135deg,#fffaf0,#fbeed2)] px-3 py-1.5 text-sm font-semibold text-[#7a5310] transition hover:border-[#e8d1a0] hover:shadow-[0_4px_14px_-6px_rgba(200,150,62,0.7)] active:scale-95"
                  >
                    <Gift className="cowry-wobble size-4" aria-hidden="true" />
                    Gift
                  </button>
                ) : undefined
              }
            />
          </div>
        )
      })}

      {canGift && giftTarget && (
        <GiftTray
          open
          onOpenChange={(open) => !open && setGiftTarget(null)}
          recipientId={giftTarget.authorId}
          recipientName={giftTarget.authorName}
          targetType="post"
          targetId={giftTarget.postId}
        />
      )}
    </div>
  )
}
