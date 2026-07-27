/**
 * Care Connect — Team roster service.
 * Thin axios wrappers around the `/careconnectTeam` backend function.
 */

import axiosClient from "@/lib/axios"
import type { TeamMember, WeeklyAvailability } from "@/utils/careconnect/types"

export interface InviteTeamMemberInput {
  name: string
  role?: string
  email?: string
  phone?: string
  /** Origin + invite path (no query); the backend appends the token and emails the link. */
  inviteUrlBase?: string
}

/** A newly-invited member, plus whether the backend emailed the invite. */
export type InvitedTeamMember = TeamMember & { emailed?: boolean }

export interface MyMembership {
  isProfessional: boolean
  member?: TeamMember
}

/** The agency's own roster. */
export async function listMyTeam(): Promise<TeamMember[]> {
  const { data } = await axiosClient.get("/careconnectTeam")
  return data.data
}

export async function inviteTeamMember(input: InviteTeamMemberInput): Promise<InvitedTeamMember> {
  const { data } = await axiosClient.post("/careconnectTeam", input)
  return data.data
}

export async function updateTeamMember(
  id: string,
  patch: Partial<Pick<TeamMember, "name" | "role" | "avatarBg" | "availability">>,
): Promise<TeamMember> {
  const { data } = await axiosClient.patch(`/careconnectTeam/${id}`, patch)
  return data.data
}

export async function removeTeamMember(id: string): Promise<void> {
  await axiosClient.delete(`/careconnectTeam/${id}`)
}

/** Invited professional attaches their account via the invite token. */
export async function acceptInvite(token: string): Promise<TeamMember> {
  const { data } = await axiosClient.post("/careconnectTeam/accept", { token })
  return data.data
}

/** The caller's own team-membership (replaces the localStorage professional flag). */
export async function getMyMembership(): Promise<MyMembership> {
  const { data } = await axiosClient.get("/careconnectTeam/me")
  return data.data
}

export async function updateMyAvailability(availability: WeeklyAvailability): Promise<TeamMember> {
  const { data } = await axiosClient.patch("/careconnectTeam/me/availability", { availability })
  return data.data
}
