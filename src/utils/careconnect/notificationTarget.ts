import { Routes } from "@/routes/constants"
import type { CareFlow } from "@/components/app/useCareFlow"
import type { AppNotification } from "@/utils/careconnect/services/notificationsService"

/**
 * Where a notification should take the reader.
 *
 * Resolved here rather than sent as an `actionUrl` from the server, for two reasons: the
 * backend has no business knowing this app's route strings, and the right destination
 * depends on the *viewer's* flow — an individual's bookings live at `/user/schedule`
 * while a company's are under `/agency/tele-health`. One notification document read by
 * either side would need two different URLs.
 *
 * A server-supplied `actionUrl` still wins when there is one, since Care-On-Board
 * notifications set it — but only if it is an app-relative path. An absolute URL from a
 * notification document must never become a `<Link>` target: these documents are written
 * by backend code today, and treating one as navigable is how that stops being safe.
 */
export function notificationTarget(
  notification: Pick<AppNotification, "entityType" | "actionUrl">,
  flow: CareFlow,
): string | null {
  const supplied = notification.actionUrl?.trim()
  if (supplied && supplied.startsWith("/") && !supplied.startsWith("//")) return supplied

  const isAgency = flow === "agency"

  switch (notification.entityType) {
    case "careconnect_booking":
      return isAgency ? Routes.app.agency.telehealth : Routes.app.user.schedule
    case "careconnect_follow_up":
      // Companies have no follow-ups screen; their telehealth area is the closest thing.
      return isAgency ? Routes.app.agency.telehealth : Routes.app.user.followUps
    case "careconnect_record":
      return Routes.app.user.records
    case "careconnect_application":
      return isAgency ? Routes.app.agency.applications : Routes.app.user.applications
    default:
      // Unknown entity type: no link at all, rather than a guess that lands somewhere
      // irrelevant. The notification still reads and still marks itself read.
      return null
  }
}
