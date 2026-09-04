import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Eye, Info, ShieldCheck } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { getAuthErrorMessage } from "@/utils/auth"
import { describeAccessEvent } from "@/utils/careconnect/accessLog"
import {
  getConsentPolicies,
  getSharingConsent,
  listEpisodeShares,
  listRecordAccessLog,
  revokeEpisodeShare,
  setSharingConsent,
  type AccessLogPage,
} from "@/utils/careconnect/services/clinicalService"
import {
  formatDate,
  formatRelative,
  type ConsentPolicies,
  type EpisodeShareGrant,
  type RecordAccessEntry,
  type SharingConsent,
} from "@/utils/careconnect/types"

/**
 * The client's control over who can read their past visit records, plus the log
 * of who actually has.
 *
 * The copy here matters as much as the switch. Revocation is forward-only on the
 * server — it blocks further access and never deletes a record already written —
 * so this must not imply deletion. The access log is the honest answer to "who
 * has already seen this", which a toggle cannot undo.
 */
/** Enough to see recent activity at a glance without the section dominating the page. */
const ACCESS_LOG_PAGE_SIZE = 15

const EMPTY_ACCESS_PAGE: AccessLogPage = { entries: [], nextCursor: null }

const EMPTY_SHARES: { grants: EpisodeShareGrant[]; ttlDays: number } = { grants: [], ttlDays: 0 }

export function ConsentPanel() {
  const [loading, setLoading] = useState(true)
  const [consent, setConsent] = useState<SharingConsent | null>(null)
  const [policies, setPolicies] = useState<ConsentPolicies | null>(null)
  const [accessLog, setAccessLog] = useState<RecordAccessEntry[]>([])
  // Null once the log is exhausted, which is the only reliable "no more" signal: a page
  // can arrive short of its limit because the client's own events were filtered out.
  const [accessCursor, setAccessCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(false)
  // Per-course-of-care sharing, independent of the account-level switch above.
  const [episodeShares, setEpisodeShares] = useState<EpisodeShareGrant[]>([])
  const [shareTtlDays, setShareTtlDays] = useState(0)
  const [revokingEpisodeId, setRevokingEpisodeId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const [sharing, policyText, log, shares] = await Promise.all([
          getSharingConsent().catch(() => null),
          getConsentPolicies().catch(() => null),
          listRecordAccessLog({ limit: ACCESS_LOG_PAGE_SIZE }).catch(() => EMPTY_ACCESS_PAGE),
          listEpisodeShares().catch(() => EMPTY_SHARES),
        ])
        if (!active) return
        setConsent(sharing)
        setPolicies(policyText)
        setAccessLog(log.entries)
        setAccessCursor(log.nextCursor)
        setEpisodeShares(shares.grants)
        setShareTtlDays(shares.ttlDays)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const loadMoreAccessLog = async () => {
    if (!accessCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await listRecordAccessLog({
        limit: ACCESS_LOG_PAGE_SIZE,
        cursor: accessCursor,
      })
      // Guard against a duplicate if the same event somehow arrives twice — an audit
      // trail that appears to show two identical accesses would be misleading.
      setAccessLog((current) => {
        const seen = new Set(current.map((entry) => entry.id))
        return [...current, ...page.entries.filter((entry) => !seen.has(entry.id))]
      })
      setAccessCursor(page.nextCursor)
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setLoadingMore(false)
    }
  }

  /**
   * Stop sharing one course of care. Refetched rather than patched locally: the server
   * decides what "inactive" means, and a client looking at their own privacy settings
   * should be shown the stored truth, not an optimistic guess at it.
   */
  const revokeShare = async (episodeId: string) => {
    setRevokingEpisodeId(episodeId)
    try {
      await revokeEpisodeShare(episodeId)
      const shares = await listEpisodeShares()
      setEpisodeShares(shares.grants)
      toast.success("Stopped sharing that course of care")
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setRevokingEpisodeId(null)
    }
  }

  const applyConsent = async (granted: boolean) => {
    if (!consent && granted && !policies) {
      toast.error("Could not load the consent wording. Please try again.")
      return
    }
    const previous = consent
    // Optimistic, with a manual revert — the same idiom as `toggleSaved` on the
    // dashboard.
    setConsent({ ...(consent ?? { granted: false }), granted })
    setSaving(true)
    try {
      const updated = await setSharingConsent(
        granted,
        granted ? policies?.sharing.version : undefined,
      )
      setConsent(updated)
      toast.success(granted ? "Record sharing turned on" : "Record sharing turned off")
    } catch (error) {
      setConsent(previous)
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = (next: boolean) => {
    // Turning sharing OFF is the consequential direction, so it gets the confirm.
    if (!next) {
      setConfirmRevoke(true)
      return
    }
    void applyConsent(true)
  }

  if (loading) {
    return (
      <div className="space-y-4 rounded-2xl border border-[#e5ecf5] bg-white p-5">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    )
  }

  const granted = consent?.granted === true

  return (
    <>
      <section className="rounded-2xl border border-[#e5ecf5] bg-white p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#00898c]" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-[#151922]">Sharing your records</h3>
                <p className="mt-1 text-sm text-[#657080]">
                  Let professionals I book see my past visit records.
                </p>
              </div>
              <Switch
                checked={granted}
                disabled={saving}
                onCheckedChange={handleToggle}
                aria-label="Share past visit records with professionals I book"
              />
            </div>

            <p className="mt-3 text-sm text-[#657080]">
              Only professionals assigned to a confirmed or completed booking with you, and only
              records that have been signed. Turning this off hides your history from them straight
              away.
            </p>

            {granted && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#fdf3e3] px-4 py-3 text-sm text-[#8a6d1f]">
                <Info className="mt-0.5 size-4 shrink-0" />
                <span>
                  Turning this off later stops new access, but it does not delete records already
                  written, and professionals who have already read one may have their own notes.
                </span>
              </p>
            )}

            {consent?.grantedAt && granted && (
              <p className="mt-2 text-xs text-[#657080]">
                On since {formatRelative(consent.grantedAt)}
              </p>
            )}
            {consent?.revokedAt && !granted && (
              <p className="mt-2 text-xs text-[#657080]">
                Turned off {formatRelative(consent.revokedAt)}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#e5ecf5] bg-white p-5">
        <div className="flex items-start gap-3">
          <Eye className="mt-0.5 size-5 shrink-0 text-[#657080]" />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-[#151922]">
              Who has opened your health information
            </h3>
            <p className="mt-1 text-sm text-[#657080]">
              Every time someone other than you reads a visit record, an uploaded document, or the
              health details you shared for a visit, it is logged here.
            </p>

            {accessLog.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-[#e5ecf5] p-4 text-center text-sm text-[#657080]">
                No one else has opened your health information yet.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-[#eef1f3] rounded-xl border border-[#eef1f3]">
                {accessLog.map((entry) => {
                  const described = describeAccessEvent(entry)
                  return (
                    <li key={entry.id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p
                          className={`text-sm ${
                            described.denied ? "text-[#8a6d1f]" : "text-[#151922]"
                          }`}
                        >
                          {described.text}
                        </p>
                        {/* A bare name doesn't say in what capacity they opened it, so
                            the role stays visible alongside it. */}
                        {described.named && (
                          <p className="mt-0.5 text-xs capitalize text-[#657080]">
                            {described.actorRole}
                          </p>
                        )}
                        {described.denied && (
                          <p className="mt-0.5 text-xs text-[#657080]">
                            They did not see it. Refused attempts are logged too.
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-[#657080]">
                        {formatRelative(entry.timestamp ?? entry.createdAt)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}

            {/* Courses of care shared individually. This is the control surface for what
                the consent wording promises — "I can withdraw it at any time" is only true
                if the client can see what they have shared. Inactive grants stay listed so
                a thread that has closed itself is visible rather than simply gone. */}
            {episodeShares.length > 0 && (
              <div className="mt-6 border-t border-[#eef1f3] pt-5">
                <h3 className="text-sm font-semibold text-[#151922]">
                  Courses of care you have shared
                </h3>
                <p className="mt-1 text-sm text-[#657080]">
                  Each covers only its own visits, and ends on its own after{" "}
                  {shareTtlDays || 180} days.
                </p>
                <ul className="mt-3 space-y-2">
                  {episodeShares.map((grant) => (
                    <li
                      key={grant.episodeId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#eef1f3] px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-[#151922]">
                          {grant.active ? "Shared with the care team" : "No longer shared"}
                        </p>
                        <p className="mt-0.5 text-xs text-[#657080]">
                          {grant.active
                            ? `Ends ${formatDate(grant.expiresAt)}`
                            : grant.inactiveReason === "expired"
                              ? "Ended automatically"
                              : "You withdrew this"}
                          {grant.revokedFor.length > 0
                            ? ` · ${grant.revokedFor.length} professional${
                                grant.revokedFor.length === 1 ? "" : "s"
                              } removed`
                            : ""}
                        </p>
                      </div>
                      {grant.active && (
                        <button
                          type="button"
                          onClick={() => void revokeShare(grant.episodeId)}
                          disabled={revokingEpisodeId === grant.episodeId}
                          className="shrink-0 text-sm font-semibold text-[#ff3e66] hover:opacity-80 disabled:opacity-50"
                        >
                          {revokingEpisodeId === grant.episodeId ? "Stopping…" : "Stop sharing"}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-[#657080]">
                  Stopping prevents any further reading. It does not delete records already
                  written, or undo access that has already happened — the log below shows that.
                </p>
              </div>
            )}

            {/* Only offered when the server said there is more. The count is stated
                because "Show more" alone gives no sense of how far back the log goes. */}
            {accessCursor && (
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-[#657080]">
                  Showing the {accessLog.length} most recent
                </p>
                <button
                  type="button"
                  onClick={loadMoreAccessLog}
                  disabled={loadingMore}
                  className="rounded-full border border-[#d6d6d6] px-4 py-2 text-sm font-semibold text-[#151922] transition hover:border-[#00b4b8]/40 hover:bg-[#f2f6f8] disabled:opacity-60"
                >
                  {loadingMore ? "Loading…" : "Show older"}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <AlertDialog open={confirmRevoke} onOpenChange={setConfirmRevoke}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turn off record sharing?</AlertDialogTitle>
            <AlertDialogDescription>
              Professionals you book will no longer be able to read your past visit records. They
              will still see records they wrote themselves, and this does not delete anything that
              has already been written.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep sharing on</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmRevoke(false)
                void applyConsent(false)
              }}
            >
              Turn off
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
