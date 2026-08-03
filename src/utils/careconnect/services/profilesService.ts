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
 * Fetch a single public profile by uid. Viewing someone else's profile
 * increments their view count; fetching your own uid does not.
 */
export async function getProfile(uid: string): Promise<CareConnectProfile> {
  const { data } = await careconnectClient.get(`/careconnectProfiles/${uid}`)
  return data.data
}

/** Upload a profile avatar or cover image, returning its public URL. */
export async function uploadProfileImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  const { data } = await axiosClient.post("/uploads/careconnect-profile-image", formData)
  return data.data.url
}
