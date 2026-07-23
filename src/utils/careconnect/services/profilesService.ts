/**
 * Care Connect — Profiles / directory service.
 * Thin axios wrappers around the `/careconnectProfiles` backend function.
 */

import axiosClient from "@/lib/axios"
import type { CareConnectProfile, ListProfilesParams } from "../types"

export async function listProfiles(
  params: ListProfilesParams = {},
): Promise<CareConnectProfile[]> {
  const { data } = await axiosClient.get("/careconnectProfiles", { params })
  return Array.isArray(data?.data) ? data.data : []
}

/**
 * Fetch a single public profile by uid. Viewing someone else's profile
 * increments their view count; fetching your own uid does not.
 */
export async function getProfile(uid: string): Promise<CareConnectProfile> {
  const { data } = await axiosClient.get(`/careconnectProfiles/${uid}`)
  return data.data
}
