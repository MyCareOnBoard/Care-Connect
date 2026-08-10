/**
 * Care Connect — Jobs & Applications types
 *
 * Mirrors the backend Firestore shapes (careconnectJobs / careconnectApplications).
 * Request/response types are colocated here rather than in the auth `types/` folder,
 * matching how the auth service colocates its own backend types.
 */

import type { WeeklyAvailability } from "@/utils/professional/availabilityStore"

export type { WeeklyAvailability, DaySlot } from "@/utils/professional/availabilityStore"

export type EmploymentType = "full_time" | "part_time" | "contract" | "per_diem"
export type JobStatus = "open" | "closed" | "draft"
export type ApplicationStatus =
  | "submitted"
  | "received"
  | "under_review"
  | "shortlisted"
  | "interviewing"
  | "offer"
  | "not_selected"
  | "closed"
export type Availability =
  | "immediately"
  | "within_2_weeks"
  | "within_1_month"
  | "more_than_1_month"

/** Firestore Admin SDK Timestamps serialize to this shape over JSON. */
export interface FirestoreTimestamp {
  _seconds: number
  _nanoseconds: number
}
export type Timestampish = string | number | FirestoreTimestamp | null | undefined

export type ScreeningQuestionType = "short_answer" | "yes_no" | "multiple_choice"

/** A company-defined screening question attached to a job posting. */
export interface ScreeningQuestion {
  id: string
  question: string
  type: ScreeningQuestionType
  options?: string[]
  required: boolean
}

/** An applicant's answer to one of a job's screening questions. */
export interface ScreeningAnswer {
  questionId: string
  question: string
  type: ScreeningQuestionType | string
  answer: string
}

export interface Job {
  id: string
  posterId: string
  posterName: string | null
  title: string
  company: string
  location: string
  employmentType: EmploymentType
  tags: string[]
  description: string
  hirerName?: string
  hirerTitle?: string
  benefits: string[]
  salary?: number
  salaryCurrency?: string
  status: JobStatus
  screeningQuestions?: ScreeningQuestion[]
  viewsCount: number
  applicationsCount: number
  savedCount: number
  createdAt?: Timestampish
  updatedAt?: Timestampish
}

export interface CreateJobPayload {
  title: string
  company: string
  location: string
  employmentType?: EmploymentType
  tags?: string[]
  description: string
  hirerName?: string
  hirerTitle?: string
  benefits?: string[]
  salary?: number
  salaryCurrency?: string
  status?: JobStatus
  screeningQuestions?: ScreeningQuestion[]
}
export type UpdateJobPayload = Partial<CreateJobPayload>

export interface ListJobsParams {
  search?: string
  employmentType?: EmploymentType
  status?: JobStatus
  posterId?: string
  limit?: number
  offset?: number
}

export interface Screening {
  willingToRelocate: boolean
  certificationsUpToDate: boolean
  availability: Availability
  whyInterested?: string
}

export interface Application {
  id: string
  jobId: string
  applicantId: string
  applicantName: string | null
  posterId: string
  jobTitle: string
  employer: string
  location: string
  employmentType: EmploymentType
  status: ApplicationStatus
  screening: Screening
  screeningAnswers?: ScreeningAnswer[]
  createdAt?: Timestampish
  updatedAt?: Timestampish
}

export interface ApplicationStats {
  total: number
  submitted: number
  received: number
  under_review: number
  shortlisted: number
  interviewing: number
  offer: number
  not_selected: number
  closed: number
}

export interface ApplyPayload {
  jobId: string
  screening: Screening
  screeningAnswers?: ScreeningAnswer[]
}

/** Human-readable labels for enum values (the mock UI used these strings). */
export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  per_diem: "Per diem",
}

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: "Application Received",
  received: "Application Received",
  under_review: "Under Review",
  shortlisted: "Shortlisted",
  interviewing: "Interviewing",
  offer: "Offer",
  not_selected: "Not Selected",
  closed: "Closed",
}

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  immediately: "Immediately",
  within_2_weeks: "Within 2 weeks",
  within_1_month: "Within 1 month",
  more_than_1_month: "More than 1 month",
}

/** Reverse of AVAILABILITY_LABELS, for mapping the screening panel's radio values. */
export const AVAILABILITY_FROM_LABEL: Record<string, Availability> = {
  Immediately: "immediately",
  "Within 2 weeks": "within_2_weeks",
  "Within 1 month": "within_1_month",
  "More than 1 month": "more_than_1_month",
}

/** Normalize any of the timestamp encodings the backend may send to a Date. */
export function toDate(value: Timestampish): Date | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string") {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (typeof value === "number") return new Date(value)
  const seconds =
    "_seconds" in value
      ? value._seconds
      : (value as { seconds?: number }).seconds
  return typeof seconds === "number" ? new Date(seconds * 1000) : null
}

/** e.g. "May 18, 2026" */
export function formatDate(value: Timestampish): string {
  const date = toDate(value)
  if (!date) return "—"
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/** e.g. "2 hours ago" / "Yesterday" */
export function formatRelative(value: Timestampish): string {
  const date = toDate(value)
  if (!date) return "—"
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  return formatDate(value)
}

export type DirectoryType = "individual" | "company"

export interface CareConnectProfile {
  uid: string
  userType: string | null
  name: string
  profession: string | null
  organizationName: string | null
  organizationType: string | null
  organizationInterests: string[]
  certifications: unknown[]
  documents: unknown[]
  location: string | null
  photo: string | null
  coverImage: string | null
  subtitle: string
  headline: string | null
  description: string | null
  skills: string[]
  experience: ProfileExperience[]
  certificationDetails: ProfileCertification[]
  profileViewsCount: number
  applicationViewsCount: number
  connectionsCount: number
  /** Whether the current viewer follows/connects with this profile (set once Connections ship). */
  isFollowing?: boolean
}

export interface ProfileExperience {
  role: string
  company: string
  duration: string
  description: string
}

export interface ProfileCertification {
  title: string
  provider: string
  date: string
  status: string
}

export interface ListProfilesParams {
  type?: DirectoryType
  search?: string
  limit?: number
  offset?: number
}

/** e.g. "$65,000" — returns null when no salary is set. */
export function formatSalary(job: Pick<Job, "salary" | "salaryCurrency">): string | null {
  if (job.salary === undefined || job.salary === null) return null
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: job.salaryCurrency || "USD",
      maximumFractionDigits: 0,
    }).format(job.salary)
  } catch {
    // Unknown currency code — fall back to a plain number with the code.
    return `${job.salaryCurrency || ""} ${job.salary.toLocaleString()}`.trim()
  }
}

/* ── Telehealth: team members, services, bookings ─────────────────────────── */

export type ServiceMode = "online" | "in_person"
export type ServiceStatus = "active" | "archived"
export type BookingStatus = "requested" | "confirmed" | "completed" | "cancelled"
export type PaymentStatus = "pending" | "not_collected"

/** A professional on an agency's roster (careconnectTeamMembers). */
export interface TeamMember {
  id: string
  agencyId: string
  agencyName: string | null
  uid: string | null
  name: string
  role: string
  email?: string
  phone?: string
  avatarBg: string
  status: "invited" | "active"
  availability: WeeklyAvailability
  /** Coverage/service location set from the availability modal's location step. */
  location?: BookingLocation | null
  inviteToken: string
  createdAt?: Timestampish
  updatedAt?: Timestampish
}

/** Denormalized roster entry stored on a service. */
export interface ServiceTeamMember {
  id: string
  name: string
  role: string
  avatarBg: string
  uid: string | null
}

export interface TelehealthService {
  id: string
  posterId: string
  agencyName: string | null
  agencyLocation: string | null
  title: string
  description: string
  modes: ServiceMode[]
  durationMinutes: number
  price: number
  currency: string
  imageUrl?: string
  includes: string[]
  suitableFor: string[]
  teamMemberIds: string[]
  teamMembers: ServiceTeamMember[]
  status: ServiceStatus
  bookingsCount: number
  createdAt?: Timestampish
  updatedAt?: Timestampish
}

export interface BookingLocation {
  address: string
  lat?: number
  lng?: number
  placeId?: string
}

export interface TelehealthBooking {
  id: string
  serviceId: string
  serviceTitle: string
  mode: ServiceMode
  posterId: string
  agencyName: string | null
  teamMemberId: string
  professionalUid: string | null
  professionalName: string
  clientId: string
  clientName: string
  dateKey: string
  startMinutes: number
  endMinutes: number
  durationMinutes: number
  startAt?: Timestampish
  note: string
  location?: BookingLocation | null
  /** In-person visit lifecycle timestamps (null until the event occurs). */
  arrivedAt?: Timestampish
  startedAt?: Timestampish
  completedAt?: Timestampish
  price: number
  currency: string
  paymentMethod: string
  paymentStatus: PaymentStatus
  status: BookingStatus
  bookingCode: string
  createdAt?: Timestampish
  updatedAt?: Timestampish
}

/** An open booking slot — `value` is minutes-from-midnight, `label` is display. */
export interface BookingSlot {
  value: number
  label: string
}

export const SERVICE_MODE_LABELS: Record<ServiceMode, string> = {
  online: "Online",
  in_person: "In-person",
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
}

/** "9:00 AM" from minutes-from-midnight. */
export function minutesToLabel(total: number): string {
  const hours24 = Math.floor(total / 60)
  const minutes = total % 60
  const meridiem = hours24 >= 12 ? "PM" : "AM"
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  return `${hours12}:${String(minutes).padStart(2, "0")} ${meridiem}`
}

/** Local "YYYY-MM-DD" key for a Date (no UTC shift). */
export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
