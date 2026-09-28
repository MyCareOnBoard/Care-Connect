import { useRef, useState, type ReactNode } from "react"
import { Link } from "react-router"
import { Heart, MessageSquare, MoreHorizontal, Repeat2 } from "lucide-react"
import { toast } from "sonner"
import { Avatar } from "@/components/app/DashboardAvatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { formatRelative, toDate, type Timestampish } from "@/utils/careconnect/types"

export type PostComment = {
  id: string
  author: string
  text: string
}

export type PostMedia = {
  type: "image" | "video"
  url: string
}

export type PortfolioPostData = {
  id: string
  paragraphs: string[]
  hashtags?: string
  statement: string
  media?: PostMedia[]
  likes: number
  comments: PostComment[]
  reposts?: number
}

type PortfolioPostProps = {
  authorName: string
  authorRole: string
  avatarClassName: string
  initials: string
  /** Author's photo. Initials on a colour are the fallback, not the default. */
  authorPhoto?: string | null
  /** When it was posted. Omitted when the backend does not send it, rather than faked. */
  createdAt?: Timestampish
  authorHref?: string
  post: PortfolioPostData
  editable?: boolean
  onEdit?: () => void
  onRemove?: () => void
  action?: ReactNode
  /** Extra buttons at the end of the like/comment/repost row, e.g. sending a gift. */
  footerAction?: ReactNode
  /** Real-data wiring (optional — omitted surfaces stay local-only mock). */
  initialLiked?: boolean
  initialCommentCount?: number
  onLikeChange?: (nextLiked: boolean) => void
  onSubmitComment?: (text: string) => void
  onLoadComments?: () => Promise<PostComment[]>
}

export function PortfolioPost({
  authorName,
  authorRole,
  avatarClassName,
  initials,
  authorPhoto,
  createdAt,
  authorHref,
  post,
  editable = false,
  onEdit,
  onRemove,
  action,
  footerAction,
  initialLiked = false,
  initialCommentCount,
  onLikeChange,
  onSubmitComment,
  onLoadComments,
}: PortfolioPostProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(post.likes)
  const [comments, setComments] = useState(post.comments)
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [reposted, setReposted] = useState(false)
  const [repostCount, setRepostCount] = useState(post.reposts ?? 0)
  const [heartBurst, setHeartBurst] = useState(0)
  const lastTap = useRef(0)

  // Show the server count until real comments are loaded on expand.
  const commentCount = commentsLoaded ? comments.length : initialCommentCount ?? comments.length

  const toggleLike = () => {
    const next = !liked
    setLiked(next)
    setLikeCount((current) => current + (next ? 1 : -1))
    onLikeChange?.(next)
  }

  /**
   * Double-tap a photo to like it, the way every social app has taught people to.
   *
   * Measured by hand from click timing rather than onDoubleClick, which mobile browsers do
   * not fire reliably for a double tap. A double tap only ever likes — it never un-likes,
   * so tapping a photo twice to look closer cannot quietly take a like back.
   */
  const handleMediaTap = () => {
    const now = Date.now()
    if (now - lastTap.current < 320) {
      lastTap.current = 0
      setHeartBurst(now)
      if (!liked) toggleLike()
      return
    }
    lastTap.current = now
  }

  const toggleComments = async () => {
    const next = !showComments
    setShowComments(next)
    if (next && !commentsLoaded && onLoadComments) {
      try {
        const loaded = await onLoadComments()
        setComments(loaded)
      } catch {
        // leave existing comments on failure
      } finally {
        setCommentsLoaded(true)
      }
    }
  }

  const toggleRepost = () => {
    setReposted((current) => !current)
    setRepostCount((current) => current + (reposted ? -1 : 1))
    if (!reposted) toast.success("Reposted to your profile")
  }

  const submitComment = () => {
    const text = commentText.trim()
    if (!text) return
    setComments((current) => [...current, { id: `${Date.now()}`, author: "You", text }])
    setCommentText("")
    onSubmitComment?.(text)
  }

  const posted = toDate(createdAt ?? null)
  const authorBlock = (
    <div className="min-w-0">
      <h3 className="truncate font-bold text-[#151922]">{authorName}</h3>
      <p className="mt-0.5 truncate text-sm text-[#565656]">
        {authorRole}
        {posted && (
          <>
            {authorRole && <span className="mx-1.5 text-[#b0b8c3]" aria-hidden="true">·</span>}
            <time dateTime={posted.toISOString()} className="text-[#8a94a3]">
              {formatRelative(createdAt ?? null)}
            </time>
          </>
        )}
      </p>
    </div>
  )

  return (
    <article className="rounded-2xl border border-white/60 bg-white/85 p-5 shadow-[0_4px_20px_rgba(16,20,26,0.05)] backdrop-blur-md transition-shadow duration-300 hover:shadow-[0_12px_32px_-12px_rgba(16,20,26,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center min-w-0 gap-3">
          {authorHref ? (
            <Link to={authorHref} className="shrink-0">
              <Avatar className={avatarClassName} initials={initials} src={authorPhoto} alt={authorName} />
            </Link>
          ) : (
            <Avatar className={avatarClassName} initials={initials} src={authorPhoto} alt={authorName} />
          )}
          {authorHref ? <Link to={authorHref} className="min-w-0">{authorBlock}</Link> : authorBlock}
        </div>

        {editable ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Post options"
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#e2e2e2] bg-white transition hover:bg-[#f2f6f8]"
              >
                <MoreHorizontal className="size-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl border-[#dce2e6] bg-white p-1 shadow-lg">
              <DropdownMenuItem onSelect={onEdit} className="px-3 py-2 text-sm rounded-lg">
                Edit post
              </DropdownMenuItem>
              <DropdownMenuItem className="px-3 py-2 text-sm rounded-lg">
                View engagements
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onRemove} variant="destructive" className="px-3 py-2 text-sm rounded-lg">
                Remove post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          action
        )}
      </div>

      <div className="mt-4 space-y-2 text-sm leading-6 text-[#20242c]">
        {post.statement && <p>{post.statement}</p>}
        {post.paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      {post.hashtags && <p className="mt-2 text-sm font-bold text-[#0e44c2]">{post.hashtags}</p>}

      {post.media && post.media.length > 0 && (
        <div className={cn("relative mt-3 grid gap-2", post.media.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {heartBurst > 0 && (
            <span
              key={heartBurst}
              className="animate-heart-burst pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
              aria-hidden="true"
              onAnimationEnd={() => setHeartBurst(0)}
            >
              <Heart className="size-24 fill-white text-white drop-shadow-[0_6px_20px_rgba(255,62,102,0.7)]" />
            </span>
          )}
          {post.media.map((item, index) =>
            item.type === "video" ? (
              <video
                key={index}
                src={item.url}
                controls
                preload="metadata"
                className="object-contain w-full bg-black max-h-96 rounded-xl"
              />
            ) : (
              <img
                key={index}
                src={item.url}
                alt=""
                loading="lazy"
                decoding="async"
                onClick={handleMediaTap}
                draggable={false}
                className="w-full max-h-[28rem] cursor-pointer select-none rounded-xl object-cover"
              />
            ),
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-4 sm:gap-3">
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={liked}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all active:scale-90",
            liked ? "border-[#ff3e66] bg-[#fff1f4] text-[#ff3e66]" : "border-[#e2e2e2] text-[#565656] hover:border-[#ff3e66]/40"
          )}
        >
          <Heart key={liked ? "on" : "off"} className={cn("size-4", liked && "fill-[#ff3e66] animate-heart-pop")} />
          <span key={likeCount} className="animate-fadeIn tabular-nums">{likeCount}</span>
        </button>
        <button
          type="button"
          onClick={toggleComments}
          aria-pressed={showComments}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
            showComments ? "border-[#00b4b8] bg-[#eaf4ff] text-[#00b4b8]" : "border-[#e2e2e2] text-[#565656] hover:border-[#00b4b8]/40"
          )}
        >
          <MessageSquare className="size-4" />
          {commentCount}
        </button>
        <button
          type="button"
          onClick={toggleRepost}
          aria-pressed={reposted}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
            reposted ? "border-[#0f8a4d] bg-[#e9f9f0] text-[#0f8a4d]" : "border-[#e2e2e2] text-[#565656] hover:border-[#0f8a4d]/40"
          )}
        >
          <Repeat2 className="size-4" />
          {repostCount}
        </button>
        {footerAction && <div className="ml-auto">{footerAction}</div>}
      </div>

      {showComments && (
        <div className="mt-4 space-y-3 border-t border-[#eef1f3] pt-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2">
              <Avatar className="bg-[#e8f1f7] shrink-0" initials={comment.author.slice(0, 2).toUpperCase()} />
              <div className="min-w-0 flex-1 rounded-xl bg-[#f7fafc] px-3 py-2">
                <p className="text-sm font-semibold text-[#151922]">{comment.author}</p>
                <p className="text-sm text-[#505964]">{comment.text}</p>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-2">
            <Input
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  submitComment()
                }
              }}
              placeholder="Add a comment..."
              className="flex-1"
            />
            <Button type="button" size="sm" onClick={submitComment}>
              Post
            </Button>
          </div>
        </div>
      )}
    </article>
  )
}
