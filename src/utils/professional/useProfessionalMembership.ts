import { useEffect, useState } from "react"
import { getMyMembership } from "@/utils/careconnect/services/teamService"
import type { TeamMember } from "@/utils/careconnect/types"

interface MembershipState {
  loading: boolean
  isProfessional: boolean
  member: TeamMember | null
}

/**
 * Whether the current user is a Care Connect professional (an active team
 * member of some agency). Backed by `GET /careconnectTeam/me` — replaces the
 * old localStorage `isProfessionalAccount` flag.
 */
export function useProfessionalMembership(): MembershipState {
  const [state, setState] = useState<MembershipState>({
    loading: true,
    isProfessional: false,
    member: null,
  })

  useEffect(() => {
    let active = true
    getMyMembership()
      .then((result) => {
        if (active) {
          setState({ loading: false, isProfessional: result.isProfessional, member: result.member ?? null })
        }
      })
      .catch(() => {
        if (active) setState({ loading: false, isProfessional: false, member: null })
      })
    return () => {
      active = false
    }
  }, [])

  return state
}
