/**
 * Care Connect — Connections service (one-way follow / subscribe).
 * Thin axios wrappers around the `/careconnectConnections` backend function.
 */

import axiosClient from "@/lib/axios"

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
