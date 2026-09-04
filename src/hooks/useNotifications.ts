import { useCallback, useEffect, useState } from "react"
import { useAuthUser } from "@/utils/auth"
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/utils/careconnect/services/notificationsService"

/** How often the bell re-checks while the tab is open. */
const POLL_INTERVAL_MS = 60_000

/** How many the dropdown holds. It is a glance, not an inbox. */
const PAGE_SIZE = 10

/**
 * The notification bell's data.
 *
 * Polls rather than subscribing: notifications are written by Cloud Functions through the
 * Admin SDK, and the client has no Firestore read rule for the shared `notifications`
 * collection — unlike conversations, which the client SDK does read directly (see
 * `AppShell`'s unread-message `onSnapshot`). A minute's latency on a bell is acceptable;
 * granting the browser read access to a cross-tenant collection to save it is not.
 *
 * Failures are swallowed deliberately. A bell that cannot load is a non-event for the
 * user, and a toast on every poll while the network is flaky would be worse than silence.
 */
export function useNotifications() {
  const { user } = useAuthUser()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user?.uid) return
    try {
      const [page, count] = await Promise.all([
        listNotifications({ limit: PAGE_SIZE }),
        getUnreadCount(),
      ])
      setNotifications(page.notifications)
      setUnreadCount(count)
    } catch {
      // Leave whatever is already on screen rather than blanking the list.
    }
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([])
      setUnreadCount(0)
      return
    }
    let active = true
    setLoading(true)
    void refresh().finally(() => {
      if (active) setLoading(false)
    })
    const timer = window.setInterval(() => {
      // Pointless work while the tab is hidden, and it keeps the function warm for
      // nobody. The visibility listener below catches up on return.
      if (document.visibilityState === "visible") void refresh()
    }, POLL_INTERVAL_MS)
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [user?.uid, refresh])

  /** Optimistic: the badge should drop the instant it's clicked, not a poll later. */
  const markRead = useCallback(async (id: string) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, status: "read" as const } : item)),
    )
    setUnreadCount((current) => Math.max(0, current - 1))
    try {
      await markNotificationRead(id)
    } catch {
      // The next poll restores the true state, so a failed write self-corrects.
    }
  }, [])

  const markAllRead = useCallback(async () => {
    setNotifications((current) => current.map((item) => ({ ...item, status: "read" as const })))
    setUnreadCount(0)
    try {
      await markAllNotificationsRead()
    } catch {
      /* corrected by the next poll */
    }
  }, [])

  return { notifications, unreadCount, loading, refresh, markRead, markAllRead }
}
