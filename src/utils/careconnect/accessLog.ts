import {
  MEDICAL_DOCUMENT_CATEGORY_LABELS,
  type MedicalDocumentCategory,
  type RecordAccessEntry,
} from "@/utils/careconnect/types"

/**
 * Turning a PHI audit row into a sentence the client can act on.
 *
 * The log is the honest answer to "who has seen my health information", so the
 * wording has to be specific: "opened a lab result" tells someone something,
 * "accessed a resource" does not. The category comes from the audit row's
 * allow-listed `resource.category`, which is why it is available here at all —
 * titles and notes are deliberately never logged.
 *
 * Pure, so the whole action-to-phrase mapping is testable without rendering.
 */

/** Mirrors PHI_AUDIT_ACTIONS in the backend's careconnect-phi-audit.js. */
export type AccessLogAction =
  | "record_list"
  | "record_read"
  | "record_created"
  | "record_updated"
  | "record_signed"
  | "record_amended"
  | "intake_read"
  | "intake_captured"
  | "health_profile_read"
  | "health_profile_updated"
  | "health_profile_deleted"
  | "consent_granted"
  | "consent_revoked"
  | "access_log_read"
  | "medical_document_uploaded"
  | "medical_document_list"
  | "medical_document_read"
  | "medical_document_downloaded"
  | "medical_document_updated"
  | "medical_document_deleted"

/** What the event touched, so the UI can group or icon by subject. */
export type AccessLogSubject = "record" | "document" | "intake" | "profile" | "consent" | "other"

export interface AccessEventDescription {
  /** Who acted: their name when the API resolved one, else their role ("A professional"). */
  actor: string
  /** The bare role word ("professional"), so a UI can qualify a name it just showed. */
  actorRole: string
  /** True when `actor` is a person's name rather than a role. */
  named: boolean
  /** e.g. "opened a lab result" — the verb phrase, already category-specific. */
  phrase: string
  /** Full sentence, actor and phrase joined. */
  text: string
  subject: AccessLogSubject
  denied: boolean
}

const ACTION_SUBJECT: Record<AccessLogAction, AccessLogSubject> = {
  record_list: "record",
  record_read: "record",
  record_created: "record",
  record_updated: "record",
  record_signed: "record",
  record_amended: "record",
  intake_read: "intake",
  intake_captured: "intake",
  health_profile_read: "profile",
  health_profile_updated: "profile",
  health_profile_deleted: "profile",
  consent_granted: "consent",
  consent_revoked: "consent",
  access_log_read: "other",
  medical_document_uploaded: "document",
  medical_document_list: "document",
  medical_document_read: "document",
  medical_document_downloaded: "document",
  medical_document_updated: "document",
  medical_document_deleted: "document",
}

/** "a lab result" when the category is known, "a document" otherwise. */
function documentNoun(entry: RecordAccessEntry): string {
  const category = entry.resource?.category as MedicalDocumentCategory | undefined
  const label = category ? MEDICAL_DOCUMENT_CATEGORY_LABELS[category] : undefined
  if (!label) return "a document"
  // "Other" would read as "opened a other", so fall back for that one.
  if (category === "other") return "a document"
  return `a ${label.toLowerCase()}`
}

function phraseFor(entry: RecordAccessEntry): string {
  const action = entry.action as AccessLogAction
  const count = entry.resource?.recordCount ?? entry.resource?.documentCount

  switch (action) {
    case "record_list":
      return count === undefined
        ? "viewed your visit records"
        : `viewed your visit records (${count})`;
    case "record_read":
      return "opened a visit record"
    case "record_created":
      return "started a visit record"
    case "record_updated":
      return "edited a draft visit record"
    case "record_signed":
      return "signed a visit record"
    case "record_amended":
      return "amended a visit record"

    case "intake_read":
      return "viewed the health details you shared for a visit"
    case "intake_captured":
      return "attached your health profile to a booking"

    case "health_profile_read":
      return "viewed your health profile"
    case "health_profile_updated":
      return "updated your health profile"
    case "health_profile_deleted":
      return "deleted your health profile"

    case "consent_granted":
      return "granted a consent"
    case "consent_revoked":
      return "withdrew a consent"
    case "access_log_read":
      return "viewed this access log"

    case "medical_document_uploaded":
      return `added ${documentNoun(entry)}`
    case "medical_document_list":
      return count === undefined
        ? "viewed your uploaded documents"
        : `viewed your uploaded documents (${count})`;
    case "medical_document_read":
      return `opened ${documentNoun(entry)}`
    case "medical_document_downloaded":
      return `downloaded ${documentNoun(entry)}`
    case "medical_document_updated":
      return `changed the sharing on ${documentNoun(entry)}`
    case "medical_document_deleted":
      return `deleted ${documentNoun(entry)}`

    default:
      // An action added to the backend registry but not yet described here.
      // Vague, but never wrong — and it still shows that *something* happened,
      // which is the property the log exists for.
      return "accessed your health information"
  }
}

export function describeAccessEvent(entry: RecordAccessEntry): AccessEventDescription {
  const denied = entry.decision === "denied"
  const genericActor =
    entry.actorRole === "professional"
      ? "A professional"
      : entry.actorRole === "agency"
        ? "An agency"
        : entry.actorRole === "client"
          ? "You"
          : "Someone"
  const actorRole =
    entry.actorRole === "client" ? "you" : entry.actorRole ? entry.actorRole : "unknown"

  // Use the name whenever the API resolved one. A log that can only say "a professional"
  // does not answer the question it exists to answer — the client needs to know which
  // one, including on a refused attempt. "You" is never overridden: the viewer's own name
  // in place of "You" would read as somebody else entirely.
  const name = entry.actorName?.trim()
  const named = Boolean(name) && entry.actorRole !== "client"
  const actor = named ? (name as string) : genericActor

  const phrase = denied
    ? `was refused access to ${subjectNoun(entry)}`
    : phraseFor(entry)

  return {
    actor,
    actorRole,
    named,
    phrase,
    text: `${actor} ${phrase}`,
    subject: ACTION_SUBJECT[entry.action as AccessLogAction] ?? "other",
    denied,
  }
}

/** The noun a denial refers to, without implying what it contained. */
function subjectNoun(entry: RecordAccessEntry): string {
  switch (ACTION_SUBJECT[entry.action as AccessLogAction]) {
    case "document":
      return "one of your documents"
    case "record":
      return "your visit records"
    case "intake":
      return "your health details"
    case "profile":
      return "your health profile"
    default:
      return "your health information"
  }
}
