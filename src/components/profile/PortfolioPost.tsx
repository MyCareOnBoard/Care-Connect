import { useState, type ReactNode } from "react"
import { Link } from "react-router"
import { Heart, MessageSquare, MoreHorizontal } from "lucide-react"
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

export type PostComment = {
  id: string
  author: string
  text: string
}

export type PortfolioPostData = {
  id: string
  paragraphs: string[]
  hashtags?: string
  statement: string
  likes: number
  comments: PostComment[]
}

type PortfolioPostProps = {
  authorName: string
  authorRole: string
  avatarClassName: string
  initials: string
  authorHref?: string
  post: PortfolioPostData
  editable?: boolean
  onEdit?: () => void
  onRemove?: () => void
  action?: ReactNode
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
  authorHref,
  post,
  editable = false,
  onEdit,
  onRemove,
  action,
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

  // Show the server count until real comments are loaded on expand.
  const commentCount = commentsLoaded ? comments.length : initialCommentCount ?? comments.length

  const toggleLike = () => {
    const next = !liked
    setLiked(next)
    setLikeCount((current) => current + (next ? 1 : -1))
    onLikeChange?.(next)
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

  const submitComment = () => {
    const text = commentText.trim()
    if (!text) return
    setComments((current) => [...current, { id: `${Date.now()}`, author: "You", text }])
    setCommentText("")
    onSubmitComment?.(text)
  }

  const authorBlock = (
    <div>
      <h3 className="font-bold text-[#151922]">{authorName}</h3>
      <p className="mt-1 text-sm text-[#565656]">{authorRole}</p>
    </div>
  )

  return (
    <article className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-[0_4px_20px_rgba(16,20,26,0.05)] backdrop-blur-md">
      <div className="flex items-start gap-3">
        {authorHref ? (
          <Link to={authorHref}>
            <Avatar className={avatarClassName} initials={initials} />
          </Link>
        ) : (
          <Avatar className={avatarClassName} initials={initials} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            {authorHref ? <Link to={authorHref}>{authorBlock}</Link> : authorBlock}

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
                  <DropdownMenuItem onSelect={onEdit} className="rounded-lg px-3 py-2 text-sm">
                    Edit post
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg px-3 py-2 text-sm">
                    View engagements
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onRemove} variant="destructive" className="rounded-lg px-3 py-2 text-sm">
                    Remove post
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              action
            )}
          </div>

          <div className="mt-4 space-y-1 text-sm leading-6 text-[#20242c]">
            {post.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {post.hashtags && <p className="mt-4 text-sm font-bold text-[#151922]">{post.hashtags}</p>}

          <div className="mt-4 flex min-h-40 items-center justify-center rounded-xl bg-black px-8 py-10 text-white">
            <p className="max-w-xl text-center text-2xl font-black uppercase leading-tight sm:text-3xl">
              {post.statement}
            </p>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={toggleLike}
              aria-pressed={liked}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                liked ? "border-[#ff3e66] bg-[#fff1f4] text-[#ff3e66]" : "border-[#e2e2e2] text-[#565656] hover:border-[#ff3e66]/40"
              )}
            >
              <Heart className={cn("size-4", liked && "fill-[#ff3e66] animate-heart-pop")} />
              {likeCount}
            </button>
            <button
              type="button"
              onClick={toggleComments}
              aria-pressed={showComments}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                showComments ? "border-[#087fff] bg-[#eaf4ff] text-[#087fff]" : "border-[#e2e2e2] text-[#565656] hover:border-[#087fff]/40"
              )}
            >
              <MessageSquare className="size-4" />
              {commentCount}
            </button>
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
        </div>
      </div>
    </article>
  )
}
