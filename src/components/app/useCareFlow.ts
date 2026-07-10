import { useLocation } from "react-router"

export type CareFlow = "user" | "agency"

export function useCareFlow() {
  const location = useLocation()
  const flow: CareFlow = location.pathname.startsWith("/agency") ? "agency" : "user"

  return { flow }
}
