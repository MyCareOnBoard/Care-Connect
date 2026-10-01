import type { PortfolioPostData, PostMedia } from "@/components/profile/PortfolioPost"
import type { FeedPost } from "@/utils/careconnect/services/postsService"

const VIDEO_URL = /\.(mp4|mov|webm|m4v|ogg)(\?|$)/i

/** Infer whether a stored media URL is a video (else treat as image). */
export function toPostMedia(urls: string[]): PostMedia[] {
  return (urls ?? []).map((url) => ({ type: VIDEO_URL.test(url) ? "video" : "image", url }))
}

/** Map a backend feed post into the presentational PortfolioPostData shape. */
export function toPortfolioData(post: FeedPost): PortfolioPostData {
  return {
    id: post.id,
    paragraphs: post.paragraphs ?? [],
    hashtags: post.hashtags,
    statement: post.statement,
    media: toPostMedia(post.mediaUrls),
    likes: post.likesCount ?? 0,
    comments: [],
    // Carried through rather than fetched: the feed already sent the opening comment and
    // the gift tally, and the card asks for neither if they are here.
    topComment: post.topComment ?? null,
    giftsCount: post.giftsCount ?? 0,
    topGifts: post.topGifts ?? [],
    reposts: post.repostsCount ?? 0,
  }
}

/**
 * The post a feed row is actually about.
 *
 * A repost has no content of its own, so the card draws from the post it points at. This is
 * the one place that decides which, and returning null is the signal that there is nothing
 * left to draw — the post was removed.
 */
export function feedSource(row: FeedPost): FeedPost | null {
  if (!row.repostOf) return row
  return row.original ?? null
}
