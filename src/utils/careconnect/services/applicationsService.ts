/**
 * Care Connect — Applications service
 *
 * Thin axios wrappers around the `/careconnectApplications` backend function.
 */

import axiosClient from "@/lib/axios"
import type {
  Application,
  ApplicationStats,
  ApplicationStatus,
  ApplyPayload,
} from "../types"

export interface ApplicationsResult {
  applications: Application[]
  stats: ApplicationStats
}

export async function applyToJob(payload: ApplyPayload): Promise<Application> {
  const { data } = await axiosClient.post("/careconnectApplications", payload)
  return data.data
}

/**
 * List the caller's applications. The backend returns the individual's own
 * applications, or (for a company account) applications to jobs they own.
 * `jobId` optionally scopes company results to a single posting.
 */
export async function listMyApplications(
  jobId?: string,
): Promise<ApplicationsResult> {
  const { data } = await axiosClient.get("/careconnectApplications", {
    params: jobId ? { jobId } : undefined,
  })
  return { applications: data.data, stats: data.stats }
}

export async function getApplication(id: string): Promise<Application> {
  const { data } = await axiosClient.get(`/careconnectApplications/${id}`)
  return data.data
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
): Promise<Application> {
  const { data } = await axiosClient.patch(
    `/careconnectApplications/${id}/status`,
    { status },
  )
  return data.data
}
