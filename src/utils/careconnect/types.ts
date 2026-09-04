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
  /** Issue date, `yyyy-MM-dd`. */
  date: string
  /** Expiry date, `yyyy-MM-dd`. Omitted or empty means the certificate doesn't expire. */
  endDate?: string
  /** Public URL of the uploaded certificate, from `uploadCareConnectDocument`. */
  fileUrl?: string
  /** Original filename, for a readable download link. */
  fileName?: string
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
  /**
   * Daily room for an online booking, created lazily on the first join. Absent means
   * "not created yet". Join tokens are per-participant and never stored here — fetch
   * them with `getVideoRoom`.
   */
  videoRoom?: { name: string; url: string; expiresAt?: Timestampish } | null
  price: number
  currency: string
  paymentMethod: string
  paymentStatus: PaymentStatus
  status: BookingStatus
  bookingCode: string
  /**
   * Clinical layer flags. Non-PHI by design — the booking list endpoint returns
   * whole documents to the owning agency, so the intake snapshot itself lives in
   * a subcollection and is fetched separately via `getBookingIntake`.
   */
  hasIntakeSnapshot?: boolean
  intakeSnapshotAt?: Timestampish
  /** Whether the client consented to a visit record for this booking. */
  recordConsent?: {
    granted: boolean
    policyVersion?: string | null
    acceptedAt?: Timestampish
    declinedAt?: Timestampish
  } | null
  hasRecord?: boolean
  /** Set when this booking was created by accepting a follow-up. */
  followUpOf?: string | null
  followUpId?: string | null
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

/* ── Client record layer: intake, consent, visit records, follow-ups ─────── */

export type SexAtBirth = "female" | "male" | "intersex" | "prefer_not_to_say"
export type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "unknown"
export type AllergySeverity = "mild" | "moderate" | "severe"
export type MobilityLevel = "independent" | "walking_aid" | "wheelchair" | "bed_bound"
export type SmokingStatus = "never" | "former" | "current"
export type AlcoholUse = "none" | "occasional" | "regular"
export type GlucoseUnit = "mmol/L" | "mg/dL"

export interface Allergy {
  substance: string
  reaction?: string
  severity?: AllergySeverity
}

export interface Medication {
  name: string
  dose?: string
  frequency?: string
}

/**
 * The reusable health profile a client maintains once. Every field is optional —
 * intake must never be a precondition for booking a service, so the whole
 * document and each of its sections can legitimately be absent.
 */
export interface ClientHealthProfile {
  id?: string
  clientId?: string
  /** Bumped server-side on each save; a snapshot records which version it froze. */
  version?: number
  about?: {
    dateOfBirth?: string | null
    sexAtBirth?: SexAtBirth | null
    heightCm?: number | null
    weightKg?: number | null
    bloodType?: BloodType | null
    preferredLanguage?: string
  } | null
  baselines?: {
    systolic?: number | null
    diastolic?: number | null
    measuredOn?: string | null
    restingHeartRate?: number | null
    bloodGlucose?: number | null
    bloodGlucoseUnit?: GlucoseUnit | null
  } | null
  history?: {
    conditions?: string[]
    allergies?: Allergy[]
    medications?: Medication[]
  } | null
  lifestyle?: {
    smoking?: SmokingStatus | null
    alcohol?: AlcoholUse | null
  } | null
  access?: {
    mobility?: MobilityLevel | null
    mobilityAids?: string[]
    communicationNeeds?: string[]
    homeAccessNotes?: string
  } | null
  emergencyContact?: {
    name?: string
    relationship?: string
    phone?: string
  } | null
  careCircle?: {
    gpName?: string
    gpPhone?: string
    preferredHospital?: string
  } | null
  notes?: string
  createdAt?: Timestampish
  updatedAt?: Timestampish
}

/**
 * What the client attested at booking time, frozen onto that booking.
 *
 * Deliberately distinct from the live profile: the professional must see what was
 * true when the visit was arranged, not whatever the client edited since. Stored
 * at `careconnectBookings/{id}/intake/snapshot`, never as booking fields, so it
 * cannot leak through the booking list endpoint.
 */
export interface HealthProfileSnapshot extends Omit<ClientHealthProfile, "version"> {
  bookingId?: string | null
  sourceProfileVersion?: number | null
  consentEventId?: string | null
  capturedBy?: string | null
  capturedAt?: Timestampish
}

/** Vitals the professional measured during the visit. */
export interface RecordVitals {
  systolic?: number | null
  diastolic?: number | null
  heartRate?: number | null
  temperatureC?: number | null
  oxygenSaturation?: number | null
  bloodGlucose?: number | null
  bloodGlucoseUnit?: GlucoseUnit | null
}

/**
 * A draft is the author's own working copy, visible to nobody else. Only a signed
 * record reaches the client or another professional.
 */
export type RecordStatus = "draft" | "signed"

export interface RecordAmendment {
  text: string
  authorUid: string
  /** ISO instant, stamped by the server as the amendment is appended. */
  createdAt: string
}

export interface VisitRecord {
  id: string
  /** Always equal to `id`: one record per visit, keyed by its booking. */
  bookingId: string
  clientId: string
  clientName: string
  professionalUid: string
  professionalName: string
  teamMemberId: string
  posterId: string
  agencyName: string | null
  serviceId: string
  serviceTitle: string
  mode: ServiceMode
  visitAt?: Timestampish
  visitDateKey: string
  visitSummary: string
  observations: string
  concerns: string
  vitalsObserved?: RecordVitals | null
  careProvided: string[]
  followUpNeeded: boolean
  /** The author's private reasoning; the server strips it for every other viewer. */
  followUpNotes?: string
  status: RecordStatus
  signedAt?: Timestampish
  amendments?: RecordAmendment[]
  consentEventId?: string | null
  createdAt?: Timestampish
  updatedAt?: Timestampish
}

/** Account-level, revocable consent to share past records with future professionals. */
export interface SharingConsent {
  granted: boolean
  policyVersion?: string | null
  grantedAt?: Timestampish
  revokedAt?: Timestampish
}

export type ConsentKind = "record_consent" | "sharing_consent"
export type ConsentDecision = "granted" | "declined" | "revoked"

export interface ConsentEvent {
  id: string
  clientId: string
  kind: ConsentKind
  decision: ConsentDecision
  bookingId?: string | null
  policyVersion: string
  ipAddress?: string | null
  createdAt?: Timestampish
}

/** The wording being agreed to, served by the backend so it stays authoritative. */
export interface ConsentPolicies {
  record: { version: string; text: string }
  sharing: { version: string; text: string }
}

/** One row of "who opened my records", for the client's transparency view. */
export interface RecordAccessEntry {
  id: string
  actorUid: string | null
  actorRole: "client" | "professional" | "agency" | null
  /**
   * Who the actor is, resolved from their profile when the log is read. Null when they
   * have no profile or the lookup failed, in which case the UI falls back to naming
   * their role. Not stored on the audit row itself — `actorUid` is its identity.
   */
  actorName?: string | null
  action: string
  decision: "allowed" | "denied"
  denyReason?: string | null
  /**
   * Allow-listed audit fields only — mirrors PHI_AUDIT_RESOURCE_FIELDS on the
   * backend. Notably absent: document titles and notes, which can name a
   * condition and are deliberately never logged.
   */
  resource?: {
    bookingId?: string
    recordId?: string
    recordCount?: number
    scope?: string
    documentId?: string
    documentCount?: number
    category?: string
    visibility?: string
  }
  timestamp?: Timestampish
  createdAt?: string
}

export type FollowUpStatus = "proposed" | "accepted" | "declined" | "withdrawn" | "expired"

export interface FollowUp {
  id: string
  sourceBookingId: string
  serviceId: string
  serviceTitle: string
  posterId: string
  agencyName: string | null
  teamMemberId: string
  professionalUid: string | null
  professionalName: string
  clientId: string
  clientName: string
  mode: ServiceMode
  dateKey: string
  startMinutes: number
  durationMinutes: number
  /** Price comes from the service; the professional chooses whether to charge, not how much. */
  paid: boolean
  price: number
  currency: string
  message: string
  status: FollowUpStatus
  materializedBookingId?: string | null
  paymentMethod?: string
  respondedAt?: Timestampish
  declineReason?: string | null
  location?: BookingLocation | null
  createdAt?: Timestampish
  updatedAt?: Timestampish
}

/* ── Labels and option lists ─────────────────────────────────────────────── */

export const MOBILITY_LABELS: Record<MobilityLevel, string> = {
  independent: "Independent",
  walking_aid: "Uses a walking aid",
  wheelchair: "Uses a wheelchair",
  bed_bound: "Bed-bound",
}

export const ALLERGY_SEVERITY_LABELS: Record<AllergySeverity, string> = {
  mild: "Mild",
  moderate: "Moderate",
  severe: "Severe",
}

export const SEX_AT_BIRTH_LABELS: Record<SexAtBirth, string> = {
  female: "Female",
  male: "Male",
  intersex: "Intersex",
  prefer_not_to_say: "Prefer not to say",
}

export const SMOKING_LABELS: Record<SmokingStatus, string> = {
  never: "Never smoked",
  former: "Former smoker",
  current: "Current smoker",
}

export const ALCOHOL_LABELS: Record<AlcoholUse, string> = {
  none: "None",
  occasional: "Occasional",
  regular: "Regular",
}

export const RECORD_STATUS_LABELS: Record<RecordStatus, string> = {
  draft: "Draft",
  signed: "Signed",
}

export const FOLLOW_UP_STATUS_LABELS: Record<FollowUpStatus, string> = {
  proposed: "Awaiting your response",
  accepted: "Booked",
  declined: "Declined",
  withdrawn: "Withdrawn",
  expired: "Expired",
}

export const BLOOD_TYPES: BloodType[] = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "unknown",
]

/**
 * A curated starting list, not a closed one — the form always allows free text.
 * Curation keeps the common cases consistent enough to skim across visits.
 */
export const COMMON_CONDITIONS = [
  "Type 2 diabetes",
  "Type 1 diabetes",
  "High blood pressure",
  "Heart disease",
  "Asthma",
  "COPD",
  "Arthritis",
  "Osteoporosis",
  "Dementia",
  "Stroke recovery",
  "Cancer",
  "Chronic kidney disease",
  "Depression",
  "Anxiety",
  "Epilepsy",
  "Multiple sclerosis",
]

export const MOBILITY_AIDS = [
  "Walking stick",
  "Walking frame",
  "Crutches",
  "Manual wheelchair",
  "Powered wheelchair",
  "Hoist",
  "Grab rails",
  "Stairlift",
]

export const COMMUNICATION_NEEDS = [
  "Hard of hearing",
  "Deaf",
  "Visually impaired",
  "Blind",
  "Speech difficulty",
  "Interpreter needed",
  "Easy-read materials",
]

/** What a professional did on the visit. Chips keep a record history skimmable. */
export const CARE_TASKS = [
  "Personal care",
  "Medication prompt",
  "Medication administered",
  "Wound care",
  "Mobility support",
  "Meal preparation",
  "Observation only",
  "Therapy session",
  "Companionship",
  "Household support",
]

/* ── Medical documents (client-uploaded) ─────────────────────────────────── */

export type MedicalDocumentCategory =
  | "lab_result"
  | "imaging"
  | "discharge_summary"
  | "prescription"
  | "referral"
  | "vaccination"
  | "insurance"
  | "other"

/**
 * Who may read one document, chosen per file by the client.
 *
 * Separate from the account-level sharing consent: that governs professionals
 * reading each other's past notes, this governs the care team reading a file the
 * client uploaded themselves.
 */
export type MedicalDocumentVisibility = "private" | "care_team"

/**
 * A file the client uploaded about their own health.
 *
 * Note there is no `url` field, deliberately. The stored object is private and
 * no URL to it is ever issued — bytes come from an authorized, audited endpoint
 * via `fetchMedicalDocumentBlobUrl`. `storagePath` is stripped server-side too.
 */
export interface MedicalDocument {
  id: string
  clientId: string
  title: string
  category: MedicalDocumentCategory
  visibility: MedicalDocumentVisibility
  notes: string
  fileName: string
  contentType: string
  sizeBytes: number
  uploadedByUid: string
  uploadedByRole: string
  uploadedAt?: Timestampish
  updatedAt?: Timestampish
}

export const MEDICAL_DOCUMENT_CATEGORY_LABELS: Record<MedicalDocumentCategory, string> = {
  lab_result: "Lab result",
  imaging: "Scan or X-ray",
  discharge_summary: "Hospital discharge",
  prescription: "Prescription",
  referral: "Referral letter",
  vaccination: "Vaccination record",
  insurance: "Insurance document",
  other: "Other",
}

export const MEDICAL_DOCUMENT_CATEGORIES = Object.keys(
  MEDICAL_DOCUMENT_CATEGORY_LABELS,
) as MedicalDocumentCategory[]

/** Mirrors ALLOWED_MIME_TYPES in the backend's medical-document.schema.js. */
export const MEDICAL_DOCUMENT_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"

/** Mirrors MAX_FILE_BYTES in the backend schema. */
export const MEDICAL_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024

/** "2.4 MB" — for a file-size hint next to a document row. */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Whether this document can be shown inline rather than only downloaded. */
export function isViewableInline(contentType: string | null | undefined): boolean {
  if (!contentType) return false
  if (contentType === "application/pdf" || contentType === "application/x-pdf") return true
  // HEIC is an image but browsers do not render it, so it is download-only.
  return ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(contentType)
}
