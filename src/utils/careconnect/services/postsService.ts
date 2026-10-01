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
  text: string
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

/** Told how far the media upload has got, 0–1 across all files together. */
export type UploadProgress = (fraction: number) => void

/** Upload a single media file (image or video), returning its public URL (two-step create). */
export async function uploadPostMedia(file: File, onProgress?: (loadedBytes: number) => void): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  const { data } = await rootClient.post("/uploads/careconnect-post-media", formData, {
    onUploadProgress: onProgress ? (event) => onProgress(event.loaded) : undefined,
  })
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

export async function createPost(input: CreatePostInput, onProgress?: UploadProgress): Promise<FeedPost> {
  const files = (input.media ?? []).filter((file): file is File => Boolean(file))
  // Progress is counted in bytes across every file, so a big video and a small photo
  // together move the bar by how much is actually left to send.
  const total = files.reduce((sum, file) => sum + file.size, 0)
  const loaded = files.map(() => 0)
  const report = () => {
    if (onProgress && total > 0) onProgress(Math.min(1, loaded.reduce((a, b) => a + b, 0) / total))
  }
  const mediaUrls = await Promise.all(
    files.map((file, index) =>
      uploadPostMedia(file, (bytes) => {
        loaded[index] = Math.min(bytes, file.size)
        report()
      }),
    ),
  )
  const { data } = await axiosClient.post("/careconnectPosts", {
    statement: input.statement,
    paragraphs: input.paragraphs ?? [],
    hashtags: input.hashtags,
    mediaUrls,
  })
  publishCowryAward(data.cowry, "post")
  return data.data
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
