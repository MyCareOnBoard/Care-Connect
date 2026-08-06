/**
 * Care Connect — Connections service (one-way follow / subscribe).
 * Thin axios wrappers around the `/careconnectConnections` backend function.
 */

// Routed through the merged careconnectCore function (see lib/axios.ts).
import { careconnectClient as axiosClient } from "@/lib/axios"

export type ConnectionRelation = "connect" | "subscribe"

export interface Connection {
  id: string
  followerId: string
  targetId: string
  relation: ConnectionRelation
  targetType?: string | null
}

export async function follow(
  targetId: string,
  relation: ConnectionRelation = "connect",
  targetType?: "individual" | "company",
): Promise<void> {
  await axiosClient.post("/careconnectConnections", { targetId, relation, targetType })
}

export async function unfollow(targetId: string): Promise<void> {
  await axiosClient.delete(`/careconnectConnections/${targetId}`)
}

export async function listConnections(relation?: ConnectionRelation): Promise<Connection[]> {
  const { data } = await axiosClient.get("/careconnectConnections", {
    params: relation ? { relation } : undefined,
  })
  return data.data
}

export interface ConnectionRequest {
  id: string
  requester: {
    uid: string
    name: string | null
    subtitle: string | null
    photo: string | null
  }
  createdAt?: unknown
}

/** Incoming pending connection requests (the Invitations tab). */
export async function listRequests(): Promise<ConnectionRequest[]> {
  const { data } = await axiosClient.get("/careconnectConnections/requests")
  return Array.isArray(data?.data) ? data.data : []
}

export async function acceptRequest(id: string): Promise<void> {
  await axiosClient.post(`/careconnectConnections/${id}/accept`)
}

export async function declineRequest(id: string): Promise<void> {
  await axiosClient.post(`/careconnectConnections/${id}/decline`)
}
