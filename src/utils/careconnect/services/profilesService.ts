/**
 * Care Connect — Profiles / directory service.
 * Thin axios wrappers around the `/careconnectProfiles` backend function.
 */

// careconnect* calls go through the merged careconnectCore function; uploads stay
// on the shared root client (the uploads function is separate, not merged).
import axiosClient, { careconnectClient } from "@/lib/axios"
import type { CareConnectProfile, ListProfilesParams } from "../types"

export async function listProfiles(
  params: ListProfilesParams = {},
): Promise<CareConnectProfile[]> {
  const { data } = await careconnectClient.get("/careconnectProfiles", { params })
  return Array.isArray(data?.data) ? data.data : []
}

/**
 * Fetch a single public profile by uid. Viewing someone else's profile counts a
 * view — at most once per viewer per 24h, so refreshes don't inflate the total.
 * Fetching your own uid never counts a view.
 */
export async function getProfile(uid: string): Promise<CareConnectProfile> {
  const { data } = await careconnectClient.get(`/careconnectProfiles/${uid}`)
  return data.data
}

/** A suggested connection, with why it was suggested. */
export type SuggestedProfile = CareConnectProfile & {
  /** Deterministic overlap score — higher is a closer match. Ordering is already applied. */
  score: number
  /** One-line rationale, AI-phrased when available and templated from the overlap when not. */
  reason: string
  sharedSkills?: string[]
}

/**
 * People to connect with, ranked by overlap of skills, certifications, experience,
 * profession, and location. Server-cached for 24h per user, so this is cheap to call on
 * every visit to the Network tab.
 */
export async function listSuggestedPeople(): Promise<SuggestedProfile[]> {
  const { data } = await careconnectClient.get("/careconnectProfiles/me/suggestions")
  return Array.isArray(data?.data) ? data.data : []
}

export interface ProfileViewer {
  uid: string
  name: string | null
  subtitle: string | null
  photo: string | null
  viewedAt?: unknown
}

/** Recent people who viewed the current user's profile. */
export async function listProfileViewers(): Promise<ProfileViewer[]> {
  const { data } = await careconnectClient.get("/careconnectProfiles/me/viewers")
  return Array.isArray(data?.data) ? data.data : []
}

/** Upload a profile avatar or cover image, returning its public URL. */
export async function uploadProfileImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  const { data } = await axiosClient.post("/uploads/careconnect-profile-image", formData)
  return data.data.url
}
