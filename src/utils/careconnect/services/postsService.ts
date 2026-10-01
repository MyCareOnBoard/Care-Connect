/**
 * Care Connect — Social feed service (posts, likes, comments).
 * Thin axios wrappers around the `/careconnectPosts` backend function.
 */

// Posts go through the merged careconnectCore function (aliased as axiosClient below);
// media upload stays on the shared root client (uploads is a separate function).
import rootClient, { careconnectClient as axiosClient } from "@/lib/axios"
import { publishCowryAward } from "@/utils/careconnect/cowryEarned"
import type { Timestampish } from "@/utils/careconnect/types"

export interface FeedComment {
  id: string
  author: string
  authorId?: string
  /** Resolved on read for comments written before it was stored, so older ones still
   *  get a face. Null when the author has no picture. */
  authorPhoto?: string | null
  text: string
}

/** How many of one gift a post attracted. */
export interface FeedPostGift {
  giftId: string
  count: number
}

export interface FeedPost {
  id: string
  authorId: string
  authorName: string
  authorRole?: string
  authorPhoto?: string
  statement: string
  paragraphs: string[]
  hashtags?: string
  mediaUrls: string[]
  likesCount: number
  commentsCount: number
  likedByMe?: boolean
  /**
   * The opening comment, sent with the feed.
   *
   * This is what lets a card show the start of a conversation without asking for the
   * thread. Absent on an older backend, in which case the card falls back to fetching
   * comments as it always did.
   */
  topComment?: FeedComment | null
  /** Gifts sent on this post, all kinds. */
  giftsCount?: number
  /** The gifts it attracted most, highest first, at most three. */
  topGifts?: FeedPostGift[]
  /** How many people reposted this post. */
  repostsCount?: number
  /** Whether the reader has reposted it. */
  repostedByMe?: boolean
  /**
   * Present only on a repost, naming the post it points at.
   *
   * A repost carries no content of its own — no statement, no media, no counts. Everything
   * a card needs to draw comes from `original`, and the reposter is only the name above it.
   */
  repostOf?: string | null
  /** A quote-repost's own words: the one part of a repost that is new writing. */
  note?: string | null
  /** The post a repost points at, decorated exactly as a feed row is. */
  original?: FeedPost | null
  /**
   * True when this repost points at a post that is gone.
   *
   * The row is kept rather than dropped so the card can say so. A feed that silently
   * shortened itself would read as posts going missing.
   */
  originalRemoved?: boolean
  /** Not yet in every backend response; the feed shows a time only when it is present. */
  createdAt?: Timestampish
}

export interface CreatePostInput {
  statement: string
  paragraphs?: string[]
  hashtags?: string
  /** Image and/or video files; falsy entries are ignored. Uploaded before the post is created. */
  media?: Array<File | null | undefined>
}

/** Upload a single media file (image or video), returning its public URL (two-step create). */
export async function uploadPostMedia(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  const { data } = await rootClient.post("/uploads/careconnect-post-media", formData)
  return data.data.url
}

export interface ListFeedParams {
  /** Restrict to a single author's posts (e.g. a profile's own portfolio). */
  authorId?: string
}

export async function listFeed(params: ListFeedParams = {}): Promise<FeedPost[]> {
  const { data } = await axiosClient.get("/careconnectPosts", { params })
  // Opening the app pays once a day, and loading the feed is what opening the app means.
  publishCowryAward(data.cowry, "visit")
  return data.data
}

export async function deletePost(id: string): Promise<void> {
  await axiosClient.delete(`/careconnectPosts/${id}`)
}

export async function createPost(input: CreatePostInput): Promise<FeedPost> {
  const files = (input.media ?? []).filter((file): file is File => Boolean(file))
  const mediaUrls = await Promise.all(files.map((file) => uploadPostMedia(file)))
  const { data } = await axiosClient.post("/careconnectPosts", {
    statement: input.statement,
    paragraphs: input.paragraphs ?? [],
    hashtags: input.hashtags,
    mediaUrls,
  })
  publishCowryAward(data.cowry, "post")
  return data.data
}

/**
 * Repost a post, optionally with a note.
 *
 * Idempotent on the backend — the repost's id is derived from the two ids — so a double tap
 * cannot produce two reposts. Reposting earns no Cowries, which is why nothing is published
 * to the award channel here.
 */
export async function repostPost(id: string, note?: string | null): Promise<FeedPost> {
  const { data } = await axiosClient.post(`/careconnectPosts/${id}/repost`, { note: note ?? null })
  return data.data
}

/** Undo a repost. Also idempotent: undoing one that is not there is not an error. */
export async function unrepostPost(id: string): Promise<void> {
  await axiosClient.delete(`/careconnectPosts/${id}/repost`)
}

export async function likePost(id: string): Promise<void> {
  await axiosClient.post(`/careconnectPosts/${id}/like`)
}

export async function unlikePost(id: string): Promise<void> {
  await axiosClient.delete(`/careconnectPosts/${id}/like`)
}

export async function listComments(id: string): Promise<FeedComment[]> {
  const { data } = await axiosClient.get(`/careconnectPosts/${id}/comments`)
  return data.data
}

export async function addComment(id: string, text: string): Promise<FeedComment> {
  const { data } = await axiosClient.post(`/careconnectPosts/${id}/comments`, { text })
  publishCowryAward(data.cowry, "comment")
  return data.data
}

/** Cross-sibling signal: PostComposer dispatches this, DashboardFeed listens (both dashboards). */
export const POST_CREATED_EVENT = "careconnect:post-created"
