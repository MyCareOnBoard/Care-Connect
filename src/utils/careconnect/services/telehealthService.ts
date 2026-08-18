/**
 * Care Connect — Telehealth service (bookable services + bookings).
 * Thin axios wrappers around the `/careconnectTelehealth` and
 * `/careconnectBookings` backend functions.
 */

import axiosClient from "@/lib/axios"
import type {
  BookingLocation,
  BookingSlot,
  ServiceMode,
  ServiceStatus,
  TelehealthBooking,
  TelehealthService,
} from "@/utils/careconnect/types"

export interface NewServiceInput {
  title: string
  description?: string
  modes: ServiceMode[]
  durationMinutes: number
  price: number
  currency: string
  includes?: string[]
  suitableFor?: string[]
  teamMemberIds?: string[]
  image?: File | null
}

export interface ListServicesParams {
  search?: string
  posterId?: string
  status?: ServiceStatus
  limit?: number
  offset?: number
}

export interface NewBookingInput {
  serviceId: string
  teamMemberId: string
  dateKey: string
  startMinutes: number
  mode: ServiceMode
  note?: string
  paymentMethod?: string
  location?: BookingLocation
}

export interface ListBookingsParams {
  scope?: "client" | "agency" | "professional"
  status?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

/* ── Services ─────────────────────────────────────────────────────────────── */

/** Upload a service image, returning its public URL (reuses the product uploader). */
export async function uploadServiceImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  const { data } = await axiosClient.post("/uploads/careconnect-product-image", formData)
  return data.data.url
}

export async function listServices(params: ListServicesParams = {}): Promise<TelehealthService[]> {
  const { data } = await axiosClient.get("/careconnectTelehealth", { params })
  return data.data
}

export async function listMyServices(): Promise<TelehealthService[]> {
  const { data } = await axiosClient.get("/careconnectTelehealth", { params: { posterId: "me" } })
  return data.data
}

/** A service returned by intent-aware search, with why it matched. */
export type SearchedService = TelehealthService & { matchReason?: string | null }

export interface ServiceSearchResult {
  services: SearchedService[]
  /**
   * False when the results are plain keyword matches — either the query had no AI ranking
   * available, or Gemini failed and the server degraded. The UI labels accordingly.
   */
  aiRanked: boolean
}

/**
 * Search services by intent rather than wording, so "help with my mum's dementia" can
 * surface a memory-care service that never uses the word. Falls back server-side to
 * keyword matching, so this resolves with useful results either way.
 */
export async function searchServices(q: string): Promise<ServiceSearchResult> {
  const { data } = await axiosClient.get("/careconnectTelehealth/search", { params: { q } })
  return {
    services: Array.isArray(data?.data) ? data.data : [],
    aiRanked: data?.aiRanked === true,
  }
}

export async function getService(id: string): Promise<TelehealthService> {
  const { data } = await axiosClient.get(`/careconnectTelehealth/${id}`)
  return data.data
}

export async function createService(input: NewServiceInput): Promise<TelehealthService> {
  let imageUrl: string | undefined
  if (input.image) imageUrl = await uploadServiceImage(input.image)
  const { image: _image, ...rest } = input
  void _image
  const { data } = await axiosClient.post("/careconnectTelehealth", { ...rest, imageUrl })
  return data.data
}

export async function updateService(
  id: string,
  patch: Partial<Omit<NewServiceInput, "image">> & { status?: ServiceStatus },
): Promise<TelehealthService> {
  const { data } = await axiosClient.patch(`/careconnectTelehealth/${id}`, patch)
  return data.data
}

export async function deleteService(id: string): Promise<void> {
  await axiosClient.delete(`/careconnectTelehealth/${id}`)
}

/* ── Bookings ─────────────────────────────────────────────────────────────── */

/** Open slots for a service+professional on a date (availability-constrained). */
export async function getSlots(
  serviceId: string,
  teamMemberId: string,
  date: string,
): Promise<{ slots: BookingSlot[]; durationMinutes: number }> {
  const { data } = await axiosClient.get("/careconnectBookings/slots", {
    params: { serviceId, teamMemberId, date },
  })
  return data.data
}

export async function listBookings(params: ListBookingsParams = {}): Promise<TelehealthBooking[]> {
  const { data } = await axiosClient.get("/careconnectBookings", { params })
  return data.data
}

export async function createBooking(input: NewBookingInput): Promise<TelehealthBooking> {
  const { data } = await axiosClient.post("/careconnectBookings", input)
  return data.data
}

export async function updateBookingStatus(
  id: string,
  status: string,
): Promise<TelehealthBooking> {
  const { data } = await axiosClient.patch(`/careconnectBookings/${id}/status`, { status })
  return data.data
}

/** In-person visit lifecycle event, driven by the professional/agency. */
export type VisitEvent = "arrived" | "started"

/** Record an in-person visit event; the server stamps the matching timestamp. */
export async function recordVisitEvent(id: string, event: VisitEvent): Promise<TelehealthBooking> {
  const { data } = await axiosClient.patch(`/careconnectBookings/${id}/visit`, { event })
  return data.data
}

/** One participant's access to a booking's Daily room. The token is short-lived. */
export interface VideoRoomAccess {
  roomUrl: string
  token: string
  /** ISO instant when the room and token expire (end of the join window). */
  expiresAt: string
}

/**
 * Join access for an online booking's video call. The server creates the Daily room on
 * the first call and mints a fresh per-participant token on every call, so this must be
 * called each time someone joins rather than cached.
 *
 * Rejects with 409 outside the booking's join window, 400 for in-person bookings, and
 * 503 when `DAILY_API_KEY` isn't configured.
 */
export async function getVideoRoom(id: string): Promise<VideoRoomAccess> {
  const { data } = await axiosClient.post(`/careconnectBookings/${id}/video-room`)
  return data.data
}

export interface BookingIssue {
  id: string
  bookingId: string
  reason: string
  details: string
  status: string
}

/** Raise an issue against a booking (any party to it). */
export async function reportBookingIssue(
  id: string,
  reason: string,
  details?: string,
): Promise<BookingIssue> {
  const { data } = await axiosClient.post(`/careconnectBookings/${id}/issues`, { reason, details })
  return data.data
}
