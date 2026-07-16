/**
 * Care Connect — Jobs service
 *
 * Thin axios wrappers around the `/careconnectJobs` backend function.
 * Follows the authService convention: import the authenticated axios client,
 * unwrap the response envelope, and let errors throw for the caller to catch.
 */

import axiosClient from "@/lib/axios"
import type {
  Job,
  CreateJobPayload,
  UpdateJobPayload,
  ListJobsParams,
} from "../types"

export async function listJobs(params: ListJobsParams = {}): Promise<Job[]> {
  const { data } = await axiosClient.get("/careconnectJobs", { params })
  return data.data
}

export async function listMyJobs(): Promise<Job[]> {
  const { data } = await axiosClient.get("/careconnectJobs", {
    params: { posterId: "me" },
  })
  return data.data
}

export async function getJob(id: string): Promise<Job> {
  const { data } = await axiosClient.get(`/careconnectJobs/${id}`)
  return data.data
}

export async function createJob(payload: CreateJobPayload): Promise<Job> {
  const { data } = await axiosClient.post("/careconnectJobs", payload)
  return data.data
}

export async function updateJob(
  id: string,
  payload: UpdateJobPayload,
): Promise<Job> {
  const { data } = await axiosClient.patch(`/careconnectJobs/${id}`, payload)
  return data.data
}

export async function deleteJob(id: string): Promise<void> {
  await axiosClient.delete(`/careconnectJobs/${id}`)
}

export async function listSavedJobs(): Promise<Job[]> {
  const { data } = await axiosClient.get("/careconnectJobs/saved")
  return data.data
}

export async function saveJob(id: string): Promise<void> {
  await axiosClient.post(`/careconnectJobs/${id}/save`)
}

export async function unsaveJob(id: string): Promise<void> {
  await axiosClient.delete(`/careconnectJobs/${id}/save`)
}
