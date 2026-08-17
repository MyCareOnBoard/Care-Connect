/**
 * Certification display helpers, shared by the profile page, the public
 * view-profile page, and the add-certification dialog.
 */

import { format } from "date-fns"

const EXPIRING_SOON_DAYS = 60

function parseDate(value?: string): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Derive a certification's badge from its expiry date so the status stays true as
 * time passes, rather than being frozen at whatever it was when the row was added.
 * A missing or unparseable expiry is treated as "doesn't expire".
 */
export function certificationStatus(endDate?: string): string {
  const expiry = parseDate(endDate)
  if (!expiry) return "Active"
  const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / 86_400_000)
  if (daysLeft < 0) return "Expired"
  if (daysLeft <= EXPIRING_SOON_DAYS) return "Expiring soon"
  return "Active"
}

/**
 * Human-readable validity period. Falls back to whatever free text is already
 * stored in `date` for rows saved before start/end dates were separate fields.
 */
export function formatCertificationPeriod(date?: string, endDate?: string): string {
  const start = parseDate(date)
  const end = parseDate(endDate)
  if (!start && !end) return date ?? ""
  if (start && end) return `${format(start, "MMM yyyy")} – ${format(end, "MMM yyyy")}`
  if (end) return `Expires ${format(end, "MMM yyyy")}`
  return `Issued ${format(start as Date, "MMM yyyy")}`
}
