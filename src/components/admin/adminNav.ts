import { createContext, useContext } from "react"
import {
  BarChart3,
  Coins,
  Gauge,
  Gift,
  History,
  Package,
  Scale,
  Sparkles,
  type LucideIcon,
} from "lucide-react"

/**
 * The Cowry console's sections, shared by the page's own tab bar (laptop and up) and the
 * admin sidebar (phones and tablets), so the two can never list different things.
 */

export type CowryTabKey =
  | "pools"
  | "rewards"
  | "pricing"
  | "packages"
  | "gifts"
  | "analytics"
  | "reconciliation"
  | "log"

export const COWRY_TABS: Array<{ key: CowryTabKey; label: string; icon: LucideIcon }> = [
  { key: "pools", label: "Budget pools", icon: Gauge },
  { key: "rewards", label: "Reward rates", icon: Sparkles },
  { key: "pricing", label: "Pricing & fees", icon: Coins },
  { key: "packages", label: "Data packages", icon: Package },
  { key: "gifts", label: "Gifts", icon: Gift },
  { key: "analytics", label: "Gift activity", icon: BarChart3 },
  { key: "reconciliation", label: "Reconciliation", icon: Scale },
  { key: "log", label: "Change log", icon: History },
]

/** What a section wants to show beside its name: unsaved edits, or items waiting. */
export interface SectionBadge {
  dirty?: number
  count?: number
}

export interface AdminNavValue {
  /** Opens the sidebar — the section list on phones and tablets. */
  openNav: () => void
  badges: Partial<Record<CowryTabKey, SectionBadge>>
  setBadges: (badges: Partial<Record<CowryTabKey, SectionBadge>>) => void
}

export const AdminNavContext = createContext<AdminNavValue | null>(null)

/** Null outside the admin layout, so the page still renders on its own (and in tests). */
export function useAdminNav() {
  return useContext(AdminNavContext)
}
