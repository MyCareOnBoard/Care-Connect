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
  }
}
