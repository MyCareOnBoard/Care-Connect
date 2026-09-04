/**
 * Care Connect — clinical layer service (intake, consent, visit records,
 * follow-ups). Thin axios wrappers around the `/careconnectClinical` backend
 * function.
 *
 * One module because it is one backend function and one cohesive domain; the
 * sections below mirror its route groups.
 */

import axiosClient from "@/lib/axios"
import type {
  ClientHealthProfile,
  ConsentEvent,
  ConsentPolicies,
  FollowUp,
  HealthProfileSnapshot,
  MedicalDocument,
  MedicalDocumentCategory,
  MedicalDocumentVisibility,
  RecordAccessEntry,
  RecordVitals,
  SharingConsent,
  TelehealthBooking,
  VisitRecord,
} from "@/utils/careconnect/types"

const BASE = "/careconnectClinical"

/* ── Health profile (intake) ─────────────────────────────────────────────── */

/** The caller's own profile. Resolves to `null` when they have never filled it in. */
export async function getMyHealthProfile(): Promise<ClientHealthProfile | null> {
  const { data } = await axiosClient.get(`${BASE}/health-profile`)
  return data.data ?? null
}

/**
 * Whole-document upsert. PUT rather than PATCH because the form owns the
 * document, and partial-merge semantics for the allergy/medication arrays are
 * ambiguous (is a shorter array a deletion or an omission?).
 */
export async function upsertMyHealthProfile(
  patch: ClientHealthProfile,
): Promise<ClientHealthProfile> {
  const { data } = await axiosClient.put(`${BASE}/health-profile`, patch)
  return data.data
}

/** Deletes the reusable profile. Information already attached to past bookings survives. */
export async function deleteMyHealthProfile(): Promise<void> {
  await axiosClient.delete(`${BASE}/health-profile`)
}

/**
 * The health information the client attested when this booking was made.
 * Rejects with 403 for the owning agency, and for the assigned professional when
 * the client did not consent.
 */
export async function getBookingIntake(bookingId: string): Promise<HealthProfileSnapshot | null> {
  const { data } = await axiosClient.get(`${BASE}/intake/${bookingId}`)
  return data.data ?? null
}

/* ── Consent ─────────────────────────────────────────────────────────────── */

/** The current consent wording, served by the backend so it stays authoritative. */
export async function getConsentPolicies(): Promise<ConsentPolicies> {
  const { data } = await axiosClient.get(`${BASE}/consent/policy`)
  return data.data
}

export async function getSharingConsent(): Promise<SharingConsent> {
  const { data } = await axiosClient.get(`${BASE}/consent/sharing`)
  return data.data
}

/**
 * Turn record sharing on or off. Granting requires the version of the wording
 * the client was shown; revoking does not — you can always withdraw.
 *
 * Revocation is forward-only: it blocks further access and does not delete or
 * alter any record already written.
 */
export async function setSharingConsent(
  granted: boolean,
  policyVersion?: string,
): Promise<SharingConsent> {
  const { data } = await axiosClient.patch(`${BASE}/consent/sharing`, { granted, policyVersion })
  return data.data
}

export async function listConsentEvents(): Promise<ConsentEvent[]> {
  const { data } = await axiosClient.get(`${BASE}/consent/events`)
  return data.data
}

/** Who has opened the caller's records. Reads by the client themselves are excluded. */
export async function listRecordAccessLog(): Promise<RecordAccessEntry[]> {
  const { data } = await axiosClient.get(`${BASE}/access-log`)
  return data.data
}

/* ── Visit records ───────────────────────────────────────────────────────── */

export interface VisitRecordInput {
  visitSummary?: string
  observations?: string
  concerns?: string
  vitalsObserved?: RecordVitals | null
  careProvided?: string[]
  followUpNeeded?: boolean
  followUpNotes?: string
}

/** The caller's own records, as the client. Signed records only. */
export async function listMyRecords(): Promise<VisitRecord[]> {
  const { data } = await axiosClient.get(`${BASE}/records/mine`)
  return data.data
}

/**
 * One client's records, as a professional who treats them.
 *
 * `sharingEnabled` comes back alongside the list so the UI can distinguish
 * "sharing is off, so you only see your own notes" from "there is nothing here
 * yet" without a second request. Rejects with 403 only when the caller has no
 * confirmed or completed booking with the client.
 */
export async function listClientRecords(
  clientId: string,
): Promise<{ records: VisitRecord[]; sharingEnabled: boolean }> {
  const { data } = await axiosClient.get(`${BASE}/records`, { params: { clientId } })
  return {
    records: Array.isArray(data?.data) ? data.data : [],
    sharingEnabled: data?.sharingEnabled === true,
  }
}

export async function getRecord(bookingId: string): Promise<VisitRecord> {
  const { data } = await axiosClient.get(`${BASE}/records/${bookingId}`)
  return data.data
}

/**
 * This booking's record if it is already signed, else null.
 *
 * Exists so "open the record" can route a signed record to the read-only viewer — the only
 * place amendments can be added — instead of the editor, which can do nothing but show it
 * locked. A booking with nothing written yet is the normal case, not an error, so a failed
 * read resolves to null and the caller opens the editor.
 */
export async function getSignedRecord(bookingId: string): Promise<VisitRecord | null> {
  try {
    const record = await getRecord(bookingId)
    return record.status === "signed" ? record : null
  } catch {
    return null
  }
}

/**
 * Start the record for a visit. Rejects with 409 when one already exists (the
 * caller should load that one instead) or when the visit is not yet completed,
 * and 403 without the client's consent.
 */
export async function createRecord(
  bookingId: string,
  input: VisitRecordInput,
): Promise<VisitRecord> {
  const { data } = await axiosClient.post(`${BASE}/records`, { bookingId, ...input })
  return data.data
}

/** Edit a draft in place. Signed records reject with 409 — amend them instead. */
export async function updateRecord(
  bookingId: string,
  input: VisitRecordInput,
): Promise<VisitRecord> {
  const { data } = await axiosClient.patch(`${BASE}/records/${bookingId}`, input)
  return data.data
}

/**
 * Sign the record, making it visible to the client and to other professionals the
 * client has consented to share with. The only path out of draft.
 */
export async function signRecord(bookingId: string): Promise<VisitRecord> {
  const { data } = await axiosClient.post(`${BASE}/records/${bookingId}/sign`)
  return data.data
}

/** Append a correction to a signed record. Author only, within 24 hours. */
export async function amendRecord(bookingId: string, text: string): Promise<VisitRecord> {
  const { data } = await axiosClient.post(`${BASE}/records/${bookingId}/amend`, { text })
  return data.data
}

/* ── Follow-ups ──────────────────────────────────────────────────────────── */

export interface NewFollowUpInput {
  sourceBookingId: string
  serviceId: string
  dateKey: string
  startMinutes: number
  mode: "online" | "in_person"
  /** Whether to charge the service price. The amount itself is not the caller's to set. */
  paid?: boolean
  message?: string
}

export interface ListFollowUpsParams {
  scope?: "client" | "professional"
  status?: string
}

export async function proposeFollowUp(input: NewFollowUpInput): Promise<FollowUp> {
  const { data } = await axiosClient.post(`${BASE}/follow-ups`, input)
  return data.data
}

export async function listFollowUps(params: ListFollowUpsParams = {}): Promise<FollowUp[]> {
  const { data } = await axiosClient.get(`${BASE}/follow-ups`, { params })
  return data.data
}

export interface FollowUpResponseInput {
  /** Display label only — nothing is charged. */
  paymentMethod?: string
  recordConsent?: { accepted: boolean; policyVersion: string }
  declineReason?: string
  attachHealthProfile?: boolean
}

/**
 * Accept or decline a proposed follow-up. Accepting materializes a real booking,
 * returned alongside the updated follow-up.
 *
 * Rejects with 409 if the slot was taken in the meantime; the error payload
 * carries the currently open slots, and the follow-up stays proposed so the
 * professional can offer another time.
 */
export async function respondToFollowUp(
  id: string,
  response: "accepted" | "declined",
  input: FollowUpResponseInput = {},
): Promise<{ followUp: FollowUp; booking: TelehealthBooking | null }> {
  const { data } = await axiosClient.post(`${BASE}/follow-ups/${id}/respond`, {
    response,
    ...input,
  })
  return data.data
}

/** The proposing professional pulls the offer back. Only while still proposed. */
export async function withdrawFollowUp(id: string): Promise<void> {
  await axiosClient.delete(`${BASE}/follow-ups/${id}`)
}

/* ── Medical documents (client-uploaded) ─────────────────────────────────── */

export interface MedicalDocumentInput {
  title?: string
  category?: MedicalDocumentCategory
  visibility?: MedicalDocumentVisibility
  notes?: string
}

export interface ListMedicalDocumentsParams {
  clientId?: string
  category?: MedicalDocumentCategory
}

/**
 * Upload one file. Multipart, because the metadata rides alongside the bytes and
 * the server validates both in a single request.
 *
 * Note the deliberate absence of a two-step "upload then attach" flow: the other
 * uploaders in this app return a public URL that the caller then saves, which is
 * exactly the pattern that would make a lab result world-readable. Here nothing
 * is ever addressable by URL.
 */
export async function uploadMedicalDocument(
  file: File,
  input: MedicalDocumentInput = {},
): Promise<MedicalDocument> {
  const formData = new FormData()
  formData.append("file", file)
  if (input.title) formData.append("title", input.title)
  if (input.category) formData.append("category", input.category)
  if (input.visibility) formData.append("visibility", input.visibility)
  if (input.notes) formData.append("notes", input.notes)
  const { data } = await axiosClient.post(`${BASE}/medical-documents`, formData)
  return data.data
}

/**
 * The caller's own documents, or a client's care-team-visible ones when
 * `clientId` is given. Rejects with 403 for a professional with no treating
 * relationship; private documents are simply absent rather than refused.
 */
export async function listMedicalDocuments(
  params: ListMedicalDocumentsParams = {},
): Promise<MedicalDocument[]> {
  const { data } = await axiosClient.get(`${BASE}/medical-documents`, { params })
  return data.data
}

export async function getMedicalDocument(id: string): Promise<MedicalDocument> {
  const { data } = await axiosClient.get(`${BASE}/medical-documents/${id}`)
  return data.data
}

/**
 * Fetch the file itself as a blob URL for viewing.
 *
 * A plain `<img src>` or `<iframe src>` cannot be used: the endpoint requires the
 * Authorization header, and the object has no public URL by design. So the bytes
 * come through axios and become a short-lived object URL.
 *
 * **The caller must revoke the returned URL** (`URL.revokeObjectURL`) when the
 * view closes, or the blob is retained for the life of the document.
 */
export async function fetchMedicalDocumentBlobUrl(id: string): Promise<string> {
  const { data } = await axiosClient.get(`${BASE}/medical-documents/${id}/content`, {
    responseType: "blob",
  })
  return URL.createObjectURL(data as Blob)
}

/** Trigger a download of the file, prompting a save rather than rendering it. */
export async function downloadMedicalDocument(
  id: string,
  fileName: string,
): Promise<void> {
  const { data } = await axiosClient.get(`${BASE}/medical-documents/${id}/content`, {
    params: { download: "1" },
    responseType: "blob",
  })
  const url = URL.createObjectURL(data as Blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoked on the next tick so the click has already been handled.
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** Owner edits title, category, visibility or notes. The file itself is immutable. */
export async function updateMedicalDocument(
  id: string,
  input: MedicalDocumentInput,
): Promise<MedicalDocument> {
  const { data } = await axiosClient.patch(`${BASE}/medical-documents/${id}`, input)
  return data.data
}

/**
 * Delete the document. A real deletion — the stored file is removed, not flagged.
 * Owner only; a professional gets a 403.
 */
export async function deleteMedicalDocument(id: string): Promise<void> {
  await axiosClient.delete(`${BASE}/medical-documents/${id}`)
}
