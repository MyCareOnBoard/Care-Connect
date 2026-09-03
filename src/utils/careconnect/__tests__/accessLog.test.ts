import { describe, it, expect } from "vitest"
import { describeAccessEvent, type AccessLogAction } from "@/utils/careconnect/accessLog"
import type { RecordAccessEntry } from "@/utils/careconnect/types"

/**
 * The access log is the client's only answer to "who has seen my health
 * information", so vague or wrong wording is a real failure, not a cosmetic one.
 */

function entry(overrides: Partial<RecordAccessEntry> = {}): RecordAccessEntry {
  return {
    id: "log1",
    actorUid: "pro1",
    actorRole: "professional",
    action: "record_read",
    decision: "allowed",
    ...overrides,
  } as RecordAccessEntry
}

/** Every action the backend registry can emit. */
const ALL_ACTIONS: AccessLogAction[] = [
  "record_list",
  "record_read",
  "record_created",
  "record_updated",
  "record_signed",
  "record_amended",
  "intake_read",
  "intake_captured",
  "health_profile_read",
  "health_profile_updated",
  "health_profile_deleted",
  "consent_granted",
  "consent_revoked",
  "access_log_read",
  "medical_document_uploaded",
  "medical_document_list",
  "medical_document_read",
  "medical_document_downloaded",
  "medical_document_updated",
  "medical_document_deleted",
]

describe("describeAccessEvent coverage", () => {
  it("describes every action the backend can emit, with no fallback text", () => {
    // A new audit action added server-side without a phrase here would show as
    // the vague fallback; this test makes that visible rather than silent.
    for (const action of ALL_ACTIONS) {
      const described = describeAccessEvent(entry({ action }))
      expect(described.text.length).toBeGreaterThan(0)
      expect(described.phrase).not.toBe("accessed your health information")
    }
  })

  it("assigns each action a subject other than the catch-all", () => {
    for (const action of ALL_ACTIONS) {
      const { subject } = describeAccessEvent(entry({ action }))
      // access_log_read is legitimately "other"; everything else is classified.
      if (action !== "access_log_read") {
        expect(subject).not.toBe("other")
      }
    }
  })

  it("falls back safely for an action it has never seen", () => {
    const described = describeAccessEvent(entry({ action: "some_future_action" }))
    expect(described.phrase).toBe("accessed your health information")
    expect(described.subject).toBe("other")
    // Vague, but it still reports that something happened.
    expect(described.text).toBe("A professional accessed your health information")
  })
})

describe("document events", () => {
  it("names the document category rather than saying 'a document'", () => {
    const described = describeAccessEvent(
      entry({ action: "medical_document_read", resource: { category: "lab_result" } }),
    )
    expect(described.text).toBe("A professional opened a lab result")
    expect(described.subject).toBe("document")
  })

  it("distinguishes opening from downloading", () => {
    expect(
      describeAccessEvent(
        entry({ action: "medical_document_downloaded", resource: { category: "imaging" } }),
      ).phrase,
    ).toBe("downloaded a scan or x-ray")
    expect(
      describeAccessEvent(
        entry({ action: "medical_document_read", resource: { category: "imaging" } }),
      ).phrase,
    ).toBe("opened a scan or x-ray")
  })

  it("does not produce 'a other' for the catch-all category", () => {
    const described = describeAccessEvent(
      entry({ action: "medical_document_read", resource: { category: "other" } }),
    )
    expect(described.phrase).toBe("opened a document")
    expect(described.phrase).not.toContain("a other")
  })

  it("says 'a document' when no category was logged", () => {
    expect(describeAccessEvent(entry({ action: "medical_document_read" })).phrase).toBe(
      "opened a document",
    )
    expect(
      describeAccessEvent(entry({ action: "medical_document_read", resource: {} })).phrase,
    ).toBe("opened a document")
  })

  it("includes the count on a listing when one was logged", () => {
    expect(
      describeAccessEvent(
        entry({ action: "medical_document_list", resource: { documentCount: 3 } }),
      ).phrase,
    ).toBe("viewed your uploaded documents (3)")
    expect(describeAccessEvent(entry({ action: "medical_document_list" })).phrase).toBe(
      "viewed your uploaded documents",
    )
  })

  it("reports a zero-result listing honestly rather than hiding it", () => {
    // A professional who listed and saw nothing still looked.
    expect(
      describeAccessEvent(
        entry({ action: "medical_document_list", resource: { documentCount: 0 } }),
      ).phrase,
    ).toBe("viewed your uploaded documents (0)")
  })
})

describe("record and intake events", () => {
  it("distinguishes the record lifecycle verbs", () => {
    const phrase = (action: AccessLogAction) => describeAccessEvent(entry({ action })).phrase
    expect(phrase("record_read")).toBe("opened a visit record")
    expect(phrase("record_created")).toBe("started a visit record")
    expect(phrase("record_signed")).toBe("signed a visit record")
    expect(phrase("record_amended")).toBe("amended a visit record")
  })

  it("describes an intake read in the client's own terms", () => {
    expect(describeAccessEvent(entry({ action: "intake_read" })).phrase).toBe(
      "viewed the health details you shared for a visit",
    )
  })
})

describe("denials", () => {
  it("says access was refused, and names the subject without implying content", () => {
    const described = describeAccessEvent(
      entry({
        action: "medical_document_read",
        decision: "denied",
        denyReason: "document_is_private",
        resource: { category: "lab_result" },
      }),
    )
    expect(described.denied).toBe(true)
    expect(described.text).toBe("A professional was refused access to one of your documents")
    // Crucially, a refused attempt must NOT disclose what the document was —
    // the whole point of a private document is that it stays unnamed.
    expect(described.text).not.toContain("lab result")
  })

  it("names the right subject for each kind of denial", () => {
    const denied = (action: AccessLogAction) =>
      describeAccessEvent(entry({ action, decision: "denied" })).phrase
    expect(denied("record_list")).toContain("your visit records")
    expect(denied("intake_read")).toContain("your health details")
    expect(denied("medical_document_read")).toContain("one of your documents")
  })
})

describe("actor wording", () => {
  it("never invents a name, since the log stores only a uid", () => {
    expect(describeAccessEvent(entry({ actorRole: "professional" })).actor).toBe("A professional")
    expect(describeAccessEvent(entry({ actorRole: "agency" })).actor).toBe("An agency")
    expect(describeAccessEvent(entry({ actorRole: "client" })).actor).toBe("You")
    expect(describeAccessEvent(entry({ actorRole: null })).actor).toBe("Someone")
  })
})
