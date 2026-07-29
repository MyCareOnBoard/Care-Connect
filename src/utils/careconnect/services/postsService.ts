/**
 * Care Connect — Social feed service (posts, likes, comments).
 * Thin axios wrappers around the `/careconnectPosts` backend function.
 */

import axiosClient from "@/lib/axios"

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
  const { data } = await axiosClient.post("/uploads/careconnect-post-media", formData)
  return data.data.url
}

export async function listFeed(): Promise<FeedPost[]> {
  const { data } = await axiosClient.get("/careconnectPosts")
  return data.data
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
  return data.data
}

/** Cross-sibling signal: PostComposer dispatches this, DashboardFeed listens (both dashboards). */
export const POST_CREATED_EVENT = "careconnect:post-created"
