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
