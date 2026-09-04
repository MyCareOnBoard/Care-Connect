/**
 * Notifications — thin axios wrappers around the shared `notifications` Cloud Function.
 *
 * Shared with Care-On-Board rather than Care Connect-specific: the same collection, the
 * same endpoints, and the same delivery trigger that sends the email. What was missing was
 * anything on this side calling them — the bell rendered a hardcoded "No notifications".
 *
 * Note these endpoints answer with bare bodies (`{ notifications, pagination }`,
 * `{ unreadCount }`), not the `{ success, data }` envelope the careconnect routes use.
 */

import axiosClient from "@/lib/axios"

const BASE = "/notifications"

export type NotificationStatus = "unread" | "read" | "archived" | "deleted"

export interface AppNotification {
  id: string
  type: string
  category: string
  priority: "urgent" | "high" | "normal" | "low"
  title: string
  message: string
  status: NotificationStatus
  /** Where the notification points, when it points anywhere. */
  actionUrl?: string | null
  entityType?: string | null
  entityId?: string | null
  createdAt?: string | { _seconds: number } | number | null
  readAt?: string | { _seconds: number } | number | null
}

export interface NotificationPage {
  notifications: AppNotification[]
  hasMore: boolean
  total: number
}

/** Newest first. `status: "unread"` narrows to what still needs attention. */
export async function listNotifications(
  params: { status?: NotificationStatus; limit?: number; offset?: number } = {},
): Promise<NotificationPage> {
  const { data } = await axiosClient.get(BASE, {
    params: {
      ...(params.status ? { status: params.status } : {}),
      limit: params.limit ?? 20,
      ...(params.offset ? { offset: params.offset } : {}),
    },
  })
  return {
    notifications: data.notifications ?? [],
    hasMore: data.pagination?.hasMore ?? false,
    total: data.pagination?.total ?? 0,
  }
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await axiosClient.get(`${BASE}/unread-count`)
  return data.unreadCount ?? 0
}

export async function markNotificationRead(id: string): Promise<void> {
  await axiosClient.patch(`${BASE}/${id}/read`)
}

export async function markAllNotificationsRead(): Promise<void> {
  await axiosClient.post(`${BASE}/mark-all-read`)
}

export async function deleteNotification(id: string): Promise<void> {
  await axiosClient.delete(`${BASE}/${id}`)
}
