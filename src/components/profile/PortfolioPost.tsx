import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import { Link } from "react-router"
import { Gift, Heart, Link2, Maximize2, MessageSquare, MoreHorizontal, Repeat2, Share2 } from "lucide-react"
import { toast } from "sonner"
import { Avatar } from "@/components/app/DashboardAvatar"
import { EmojiPicker } from "@/components/app/EmojiPicker"
import { PostVideo } from "@/components/profile/PostVideo"
import { PostImage } from "@/components/profile/PostImage"
import { PostText } from "@/components/profile/PostText"
import { PostViewer } from "@/components/profile/PostViewer"
import { MediaCarousel } from "@/components/profile/MediaCarousel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { haptic } from "@/lib/haptics"
import { playSound } from "@/lib/sound"
import { GiftIcon } from "@/components/cowry/GiftIcon"
import { cn } from "@/lib/utils"
import { formatRelative, toDate, type Timestampish } from "@/utils/careconnect/types"

export type PostComment = {
  id: string
  author: string
  /** A face beside the words. Initials are the fallback, not the default. */
  authorPhoto?: string | null
  text: string
}

/** How many of one gift a post attracted. */
export type PostGift = {
  giftId: string
  count: number
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
  /**
   * The opening comment, if the feed already sent it.
   *
   * When present the card shows the conversation without asking for the thread. When
   * absent — an older backend, or a surface that does not send it — the card falls
   * back to fetching comments when it scrolls into view, as it always did.
   */
  topComment?: PostComment | null
  /** Gifts sent on this post, all kinds. */
  giftsCount?: number
  /** The gifts it attracted most, highest first. At most three are drawn. */
  topGifts?: PostGift[]
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
  /** Adds a Gift button to the action row. Omit where gifting does not apply. */
  onGift?: () => void
  /** A link to this post, for Share → Copy link. Share only offers what it can do. */
  shareUrl?: string
  /** Where a tapped #hashtag leads (usually the feed filtered to it). */
  tagHref?: (tag: string) => string
  /** Where a tapped @mention leads. */
  profileHref?: (uid: string) => string
  /**
   * Who reposted this, when the card is showing up in the feed because they did.
   *
   * A repost has no content of its own, so this card is still the post's card: the author
   * shown, the text, the counts and every action all belong to the post. This is only the
   * line above it saying how the reader came to see it.
   */
  repostedBy?: {
    name: string
    href?: string
    /** A quote-repost's own words. */
    note?: string | null
  }
  /** Real-data wiring (optional — omitted surfaces stay local-only mock). */
  initialLiked?: boolean
  initialCommentCount?: number
  /**
   * Save a like or unlike. Return the request's promise: if it fails, the like is undone
   * on screen and the person is told, rather than being left believing it saved.
   */
  onLikeChange?: (nextLiked: boolean) => void
  initialReposted?: boolean
  /**
   * Called with the state being moved to. Rejecting reverts the button, because the server
   * can refuse — reposting your own post, or one that has since been removed — and a button
   * that stays switched on after a refusal is a lie about what happened.
   */
  onRepostChange?: (nextReposted: boolean) => Promise<void> | void
  /**
   * Hides the repost action. Reposting your own post is refused, so it is not offered.
   *
   * The action also hides itself where `onRepostChange` is absent, so a surface that has
   * not been wired up shows no button rather than one that reports a repost it did not make.
   */
  canRepost?: boolean
  /** Save a comment. As with likes, a failed save takes the comment back off the post. */
  onSubmitComment?: (text: string) => void | Promise<unknown>
  onLoadComments?: () => Promise<PostComment[]>
}

/** The red of a like, shared with the double-tap heart. */
const LIKE_RED = "#ff1f3d"

/** Roughly four lines of post text before "see more". */
const COLLAPSED_HEIGHT = 104

/** How long to wait for a second tap before a single tap opens the viewer. */
const DOUBLE_TAP_MS = 300

const PHONE_QUERY = "(max-width: 39.99rem)"
const subscribePhone = (listener: () => void) => {
  const query = window.matchMedia(PHONE_QUERY)
  query.addEventListener("change", listener)
  return () => query.removeEventListener("change", listener)
}
const readPhone = () => typeof window !== "undefined" && window.matchMedia(PHONE_QUERY).matches

function CommentBubble({ comment, pending }: { comment: PostComment; pending?: boolean }) {
  return (
    <div className={cn("flex items-start gap-2 transition-opacity", pending && "opacity-60")}>
      {comment.authorPhoto ? (
        <img
          src={comment.authorPhoto}
          alt=""
          loading="lazy"
          className="size-8 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e8f1f7] text-[11px] font-bold text-[#383d45]"
          aria-hidden="true"
        >
          {comment.author.slice(0, 2).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1 rounded-2xl bg-[#f3f6f8] px-3 py-2">
        <p className="text-sm font-semibold text-[#151922]">{comment.author}</p>
        <PostText text={comment.text} className="whitespace-pre-line text-sm text-[#505964]" />
      </div>
    </div>
  )
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
  onGift,
  shareUrl,
  tagHref,
  profileHref,
  initialLiked = false,
  initialCommentCount,
  onLikeChange,
  repostedBy,
  initialReposted = false,
  onRepostChange,
  canRepost = true,
  onSubmitComment,
  onLoadComments,
}: PortfolioPostProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(post.likes)
  const [comments, setComments] = useState(post.comments)
  const [pendingComments, setPendingComments] = useState<Set<string>>(new Set())
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [reposted, setReposted] = useState(initialReposted)
  const [repostCount, setRepostCount] = useState(post.reposts ?? 0)
  const [repostBusy, setRepostBusy] = useState(false)
  const [heartBurst, setHeartBurst] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const lastTap = useRef(0)
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const articleRef = useRef<HTMLElement>(null)
  const commentInputRef = useRef<HTMLInputElement>(null)
  const isPhone = useSyncExternalStore(subscribePhone, readPhone, () => false)

  const media = post.media ?? []
  // Show the server count until real comments are loaded.
  const commentCount = commentsLoaded ? comments.length : initialCommentCount ?? comments.length

  // Long posts fold at about four lines. Measured, so a short post never shows "see more".
  useLayoutEffect(() => {
    const el = textRef.current
    if (!el || expanded) return
    setOverflowing(el.scrollHeight > COLLAPSED_HEIGHT + 4)
  }, [post.statement, post.paragraphs, expanded])

  useEffect(
    () => () => {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current)
    },
    [],
  )

  const loadComments = async () => {
    if (commentsLoaded || !onLoadComments) return
    try {
      setComments(await onLoadComments())
    } catch {
      // leave existing comments on failure
    } finally {
      setCommentsLoaded(true)
    }
  }

  /*
   * A glimpse of the conversation under each post that has one: people answer an ongoing
   * thread more readily than they start one. Fetched only once the post scrolls near the
   * screen, so a long feed does not ask for every post's comments up front.
   */
  useEffect(() => {
    if (commentsLoaded || !onLoadComments || (initialCommentCount ?? 0) === 0) return
    // Nothing to fetch a preview for when the feed already sent one. This is the whole
    // saving: a page of commented posts used to fetch a thread each, all to show one line
    // per card, and the full thread is still loaded the moment someone opens comments.
    if (post.topComment) return
    const el = articleRef.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect()
          void loadComments()
        }
      },
      { rootMargin: "200px 0px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
    // loadComments reads the latest state itself; re-observing on its identity is not needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentsLoaded, onLoadComments, initialCommentCount, post.topComment])

  /** Like or unlike straight away; if saving fails, put it back and say so. */
  const toggleLike = () => {
    const next = !liked
    setLiked(next)
    setLikeCount((current) => current + (next ? 1 : -1))
    if (next) {
      haptic("tap")
      playSound("tap")
    }
    const saving = onLikeChange?.(next)
    if (saving && typeof (saving as Promise<unknown>).catch === "function") {
      ;(saving as Promise<unknown>).catch(() => {
        setLiked(!next)
        setLikeCount((current) => current + (next ? -1 : 1))
        toast.error(next ? "Couldn't save your like. Try again." : "Couldn't remove your like. Try again.")
      })
    }
  }

  /**
   * A tap on a photo. Two quick taps like it, the way every social app has taught people
   * to; one tap, once it is clear no second is coming, opens the post full-screen.
   *
   * Measured by hand rather than with onDoubleClick, which mobile browsers do not fire
   * reliably. A double tap only ever likes — it never un-likes, so tapping twice to look
   * closer cannot quietly take a like back.
   */
  const handleMediaTap = (index: number) => {
    const now = Date.now()
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current)
      setHeartBurst(now)
      if (!liked) toggleLike()
      return
    }
    lastTap.current = now
    if (singleTapTimer.current) clearTimeout(singleTapTimer.current)
    singleTapTimer.current = setTimeout(() => setViewerIndex(index), DOUBLE_TAP_MS)
  }

  const openComments = async () => {
    setShowComments(true)
    await loadComments()
    // Straight to typing: tapping Comment means you want to write one.
    requestAnimationFrame(() => commentInputRef.current?.focus())
  }

  const toggleRepost = async () => {
    if (repostBusy) return
    const next = !reposted

    // Moved first so the button answers the tap, then put back if the server disagrees.
    setReposted(next)
    setRepostCount((current) => Math.max(0, current + (next ? 1 : -1)))
    setRepostBusy(true)

    try {
      await onRepostChange?.(next)
      if (next) toast.success(repostedBy ? "Reposted" : "Reposted to your profile")
    } catch {
      setReposted(!next)
      setRepostCount((current) => Math.max(0, current + (next ? -1 : 1)))
      toast.error(next ? "Could not repost that" : "Could not undo the repost")
    } finally {
      setRepostBusy(false)
    }
  }

  // Offered only where it is wired to the backend, and never on your own post.
  const repostable = canRepost && Boolean(onRepostChange)

  const copyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success("Link copied")
    } catch {
      toast.error("Couldn't copy the link.")
    }
  }

  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function" && Boolean(shareUrl)
  const nativeShare = async () => {
    try {
      await navigator.share({ title: `${authorName} on CareConnect`, text: post.statement.slice(0, 140), url: shareUrl })
    } catch {
      // Cancelled from the share sheet: nothing to report.
    }
  }

  /** Show the comment at once; if saving fails, take it back off and keep the text to retry. */
  const submitComment = () => {
    const text = commentText.trim()
    if (!text) return
    const id = `pending-${Date.now()}`
    setComments((current) => [...current, { id, author: "You", text }])
    setPendingComments((current) => new Set(current).add(id))
    setCommentText("")
    playSound("pop")
    const settle = () =>
      setPendingComments((current) => {
        const next = new Set(current)
        next.delete(id)
        return next
      })
    const saving = onSubmitComment?.(text)
    if (saving && typeof (saving as Promise<unknown>).then === "function") {
      ;(saving as Promise<unknown>).then(settle, () => {
        settle()
        setComments((current) => current.filter((comment) => comment.id !== id))
        setCommentText((current) => current || text)
        toast.error("Couldn't post your comment. It's back in the box to try again.")
      })
    } else {
      settle()
    }
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

  const avatar = (
    <Avatar className={avatarClassName} initials={initials} src={authorPhoto} alt={authorName} />
  )
  const header = (
    <div className="flex items-center min-w-0 gap-3">
      {authorHref ? (
        <Link to={authorHref} className="shrink-0">
          {avatar}
        </Link>
      ) : (
        avatar
      )}
      {authorHref ? <Link to={authorHref} className="min-w-0">{authorBlock}</Link> : authorBlock}
    </div>
  )

  const textBlocks = (
    <>
      {post.statement && (
        <PostText text={post.statement} tagHref={tagHref} profileHref={profileHref} />
      )}
      {post.paragraphs.map((paragraph, index) => (
        <PostText key={index} text={paragraph} tagHref={tagHref} profileHref={profileHref} />
      ))}
    </>
  )

  const collapsed = overflowing && !expanded
  const repostNote = repostedBy?.note?.trim() || null
  const giftCount = post.giftsCount ?? 0
  const topGifts = (post.topGifts ?? []).slice(0, 3)
  const hasCounts = likeCount > 0 || commentCount > 0 || repostCount > 0 || giftCount > 0

  /*
   * The comment shown under the card. Loaded comments win once they exist, because by then
   * the reader may have added one; before that the feed's own copy is used, which is why
   * the thread no longer has to be fetched just to show a single line.
   */
  const preview = showComments
    ? null
    : comments.length > 0
      ? comments[0]
      : post.topComment ?? null

  const actionButton =
    "group flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-[#565f6d] transition-all duration-150 hover:bg-[#f2f6f8] active:scale-95"

  const likeButton = (
    <button
      type="button"
      onClick={toggleLike}
      aria-pressed={liked}
      className={actionButton}
      style={liked ? { color: LIKE_RED } : undefined}
    >
      <Heart
        key={liked ? "on" : "off"}
        className={cn("size-[18px] transition-transform group-hover:scale-110", liked && "animate-heart-pop")}
        fill={liked ? LIKE_RED : "none"}
        aria-hidden="true"
      />
      {liked ? "Liked" : "Like"}
    </button>
  )

  const countsLine = hasCounts && (
    <div className="flex items-center justify-between gap-3 text-xs text-[#657080]">
      <span className="flex items-center gap-1.5">
        {likeCount > 0 && (
          <>
            <span
              className="flex size-[18px] items-center justify-center rounded-full"
              style={{ backgroundColor: LIKE_RED }}
              aria-hidden="true"
            >
              <Heart className="size-2.5 fill-white text-white" />
            </span>
            <span key={likeCount} className="animate-fadeIn tabular-nums">
              {likeCount}
            </span>
          </>
        )}
      </span>
      <span className="flex items-center gap-2">
        {commentCount > 0 && (
          <button
            type="button"
            onClick={() => (showComments ? setShowComments(false) : void openComments())}
            className="hover:text-[#00898c] hover:underline"
          >
            {commentCount} comment{commentCount === 1 ? "" : "s"}
          </button>
        )}
        {commentCount > 0 && repostCount > 0 && <span aria-hidden="true">·</span>}
        {repostCount > 0 && (
          <span>
            {repostCount} repost{repostCount === 1 ? "" : "s"}
          </span>
        )}
        {giftCount > 0 && (commentCount > 0 || repostCount > 0) && <span aria-hidden="true">·</span>}
        {giftCount > 0 && (
          /*
           * The icons carry this, not the number: a row of gifts says what a post attracted
           * at a glance, where "9 gifts" only says that some arrived. The count follows for
           * anyone who wants it.
           */
          <span className="flex items-center gap-1">
            <span className="flex items-center -space-x-1">
              {topGifts.map((gift) => (
                <GiftIcon key={gift.giftId} gift={{ id: gift.giftId }} size={16} />
              ))}
            </span>
            <span className="tabular-nums">{giftCount}</span>
            <span className="sr-only">
              gift{giftCount === 1 ? "" : "s"}
              {topGifts.length > 0 && `, mostly ${topGifts[0].giftId.replace(/_/g, " ")}`}
            </span>
          </span>
        )}
      </span>
    </div>
  )

  const commentBox = (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Input
          ref={commentInputRef}
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              submitComment()
            }
          }}
          placeholder="Add a comment..."
          className="w-full pr-10"
        />
        <EmojiPicker
          className="absolute right-1 top-1/2 -translate-y-1/2"
          onPick={(emoji) => {
            setCommentText((current) => current + emoji)
            commentInputRef.current?.focus()
          }}
        />
      </div>
      <Button type="button" size="sm" onClick={submitComment}>
        Post
      </Button>
    </div>
  )

  const commentsList = (
    <div className="space-y-3">
      {comments.map((comment) => (
        <CommentBubble key={comment.id} comment={comment} pending={pendingComments.has(comment.id)} />
      ))}
      {commentBox}
    </div>
  )

  /** A small button over a tile that opens the viewer — the only way in for a video. */
  const expandButton = (index: number) => (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        setViewerIndex(index)
      }}
      aria-label="Open full screen"
      className="absolute right-2 top-2 z-10 flex size-8 items-center justify-center rounded-full bg-black/45 text-white opacity-100 backdrop-blur transition hover:bg-black/65 sm:opacity-0 sm:group-hover/media:opacity-100 sm:focus-visible:opacity-100"
    >
      <Maximize2 className="size-4" aria-hidden="true" />
    </button>
  )

  return (
    <article
      ref={articleRef}
      className="rounded-2xl border border-white/60 bg-white/85 p-5 pb-2 shadow-[0_4px_20px_rgba(16,20,26,0.05)] backdrop-blur-md transition-shadow duration-300 hover:shadow-[0_12px_32px_-12px_rgba(16,20,26,0.18)]"
    >
      {/*
        Why this card is in the reader's feed. Above the author rather than replacing them,
        because everything below belongs to the post: a repost carries no content, and
        showing the reposter as the author is exactly the confusion that would send a gift
        to the wrong person.
      */}
      {repostedBy && (
        <div className="-mt-1 mb-3 border-b border-[#eef1f3] pb-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[#657080]">
            <Repeat2 className="size-3.5 shrink-0 text-[#0f8a4d]" aria-hidden="true" />
            {repostedBy.href ? (
              <Link to={repostedBy.href} className="hover:text-[#00898c] hover:underline">
                {repostedBy.name}
              </Link>
            ) : (
              <span>{repostedBy.name}</span>
            )}
            <span className="font-normal">reposted</span>
          </p>
          {repostNote && <p className="mt-2 text-sm text-[#2b313a]">{repostNote}</p>}
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        {header}

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
            {/* "View engagements" used to sit here with nothing behind it; it returns
                when there is an engagements view for it to open. */}
            <DropdownMenuContent align="end" className="w-52 rounded-xl border-[#dce2e6] bg-white p-1 shadow-lg">
              <DropdownMenuItem onSelect={onEdit} className="px-3 py-2 text-sm rounded-lg">
                Edit post
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

      {/* Long posts fold at about four lines, fading out, so the feed keeps moving. */}
      <div className="relative mt-4">
        <div
          ref={textRef}
          className={cn("space-y-2 overflow-hidden text-sm leading-6 text-[#20242c]", collapsed && "max-h-[104px]")}
          style={
            collapsed
              ? { maskImage: "linear-gradient(to bottom, black 60%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent)" }
              : undefined
          }
        >
          {textBlocks}
        </div>
        {overflowing && (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            className="mt-1 text-sm font-semibold text-[#657080] hover:text-[#00898c] hover:underline"
          >
            {expanded ? "See less" : "…see more"}
          </button>
        )}
      </div>

      {post.hashtags && (
        <PostText text={post.hashtags} tagHref={tagHref} profileHref={profileHref} className="mt-2 text-sm" />
      )}

      {media.length > 0 && (
        <div className="relative mt-3">
          {heartBurst > 0 && (
            <span
              key={heartBurst}
              className="animate-heart-burst pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
              aria-hidden="true"
              onAnimationEnd={() => setHeartBurst(0)}
            >
              {/* Red, the colour of a like; a white glow keeps it visible on any photo. */}
              <Heart className="size-24 fill-[#ff1f3d] text-[#ff1f3d] drop-shadow-[0_0_14px_rgba(255,255,255,0.85)]" />
            </span>
          )}

          {/* Several photos swipe one at a time on a phone; wider screens tile them. */}
          {media.length > 1 && isPhone ? (
            <MediaCarousel media={media} onTap={handleMediaTap} />
          ) : (
            <div className={cn("grid gap-2", media.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
              {media.map((item, index) => (
                <div key={index} className="group/media relative">
                  {item.type === "video" ? (
                    <PostVideo src={item.url} compact={media.length > 1} />
                  ) : (
                    <PostImage src={item.url} tiled={media.length > 1} onTap={() => handleMediaTap(index)} />
                  )}
                  {expandButton(index)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* The counts, quietly, above the buttons — what the post has earned so far. */}
      {countsLine && <div className="mt-3">{countsLine}</div>}

      {/* Evenly spaced actions: like, comment, gift, share. */}
      <div className="mt-2 flex items-center gap-1 border-t border-[#eef1f3] pt-1.5">
        {likeButton}

        <button
          type="button"
          onClick={() => (showComments ? setShowComments(false) : void openComments())}
          aria-expanded={showComments}
          className={cn(actionButton, showComments && "text-[#00898c]")}
        >
          <MessageSquare className="size-[18px] transition-transform group-hover:scale-110" aria-hidden="true" />
          Comment
        </button>

        {onGift && (
          // Gold, raised and glossy — the one button in the row that spends Cowries, so it
          // looks like it. Sits centred in its share of the row like the others.
          <div className="flex flex-1 items-center justify-center">
            <button
              type="button"
              onClick={onGift}
              className="cowry-hover inline-flex h-9 items-center gap-1.5 rounded-full border border-[#e8d1a0] bg-[linear-gradient(180deg,#fff8e6_0%,#fbeed2_45%,#f1d9a4_100%)] px-4 text-sm font-semibold text-[#7a5310] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-2px_0_rgba(168,121,62,0.25),0_4px_12px_-4px_rgba(200,150,62,0.6)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-2px_0_rgba(168,121,62,0.25),0_8px_18px_-6px_rgba(200,150,62,0.75)] active:translate-y-0 active:scale-95 active:shadow-[inset_0_2px_4px_rgba(168,121,62,0.35)]"
            >
              <Gift className="cowry-wobble size-4" aria-hidden="true" />
              Gift
            </button>
          </div>
        )}

        {(repostable || shareUrl || canNativeShare) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={cn(actionButton, reposted && "text-[#0f8a4d]")}>
              <Share2 className="size-[18px] transition-transform group-hover:scale-110" aria-hidden="true" />
              Share
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-xl border-[#dce2e6] bg-white p-1 shadow-lg">
            {/* Shown only where it is actually wired. A repost button that reports success
                without reposting anything is worse than no button. */}
            {repostable && (
              <DropdownMenuItem
                onSelect={() => void toggleRepost()}
                disabled={repostBusy}
                className="gap-2 rounded-lg px-3 py-2 text-sm"
              >
                <Repeat2 className="size-4" aria-hidden="true" />
                {reposted ? "Undo repost" : "Repost"}
              </DropdownMenuItem>
            )}
            {shareUrl && (
              <DropdownMenuItem onSelect={() => void copyLink()} className="gap-2 rounded-lg px-3 py-2 text-sm">
                <Link2 className="size-4" aria-hidden="true" />
                Copy link
              </DropdownMenuItem>
            )}
            {canNativeShare && (
              <DropdownMenuItem onSelect={() => void nativeShare()} className="gap-2 rounded-lg px-3 py-2 text-sm">
                <Share2 className="size-4" aria-hidden="true" />
                Share via…
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </div>

      {/* One comment, as an invitation into the conversation. */}
      {preview && (
        <div className="animate-fade-in-up space-y-2 border-t border-[#eef1f3] pb-2 pt-3">
          <CommentBubble comment={preview} pending={pendingComments.has(preview.id)} />
          {commentCount > 1 && (
            <button
              type="button"
              onClick={() => void openComments()}
              className="ml-10 text-xs font-semibold text-[#657080] hover:text-[#00898c] hover:underline"
            >
              View all {commentCount} comments
            </button>
          )}
        </div>
      )}

      {showComments && <div className="border-t border-[#eef1f3] pb-3 pt-4">{commentsList}</div>}

      {viewerIndex !== null && media.length > 0 && (
        <PostViewer
          media={media}
          index={Math.min(viewerIndex, media.length - 1)}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          side={
            <div className="flex min-h-full flex-col gap-4 p-5">
              {header}
              <div className="space-y-2 text-sm leading-6 text-[#20242c]">{textBlocks}</div>
              {countsLine}
              <div className="flex items-center gap-1 border-y border-[#eef1f3] py-1.5">{likeButton}</div>
              <div className="flex-1">
                {commentsLoaded || !onLoadComments ? (
                  commentsList
                ) : (
                  <button
                    type="button"
                    onClick={() => void loadComments()}
                    className="text-sm font-semibold text-[#00898c] hover:underline"
                  >
                    Show comments
                  </button>
                )}
              </div>
            </div>
          }
        />
      )}
    </article>
  )
}
