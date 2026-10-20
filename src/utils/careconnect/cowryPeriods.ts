/*
 * Time periods. The history endpoint has no date filter, so a period is applied here: the
 * list is newest first, so pages are read until one reaches back past the period's start,
 * and only rows inside it are kept. Bounded, so an old account cannot fire off requests
 * without end — "Load more" carries on from where it stopped.
 */
export type Period = "all" | "today" | "week" | "month" | "3months"

export const PERIODS: Array<{ value: Period; label: string; summary: string }> = [
  { value: "all", label: "Any time", summary: "shown below" },
  { value: "today", label: "Today", summary: "today" },
  { value: "week", label: "This week", summary: "this week" },
  { value: "month", label: "This month", summary: "this month" },
  { value: "3months", label: "Last 3 months", summary: "in the last 3 months" },
]

/** When a period starts. Weeks start on Monday. */
export function periodStart(period: Period, now = new Date()): Date | null {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (period) {
    case "today":
      return today
    case "week": {
      const daysSinceMonday = (today.getDay() + 6) % 7
      return new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysSinceMonday)
    }
    case "month":
      return new Date(today.getFullYear(), today.getMonth(), 1)
    case "3months":
      return new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())
    default:
      return null
  }
}
