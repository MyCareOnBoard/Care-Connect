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
  listRecordAccessLog,
  setSharingConsent,
} from "@/utils/careconnect/services/clinicalService"
import {
  formatRelative,
  type ConsentPolicies,
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
export function ConsentPanel() {
  const [loading, setLoading] = useState(true)
  const [consent, setConsent] = useState<SharingConsent | null>(null)
  const [policies, setPolicies] = useState<ConsentPolicies | null>(null)
  const [accessLog, setAccessLog] = useState<RecordAccessEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const [sharing, policyText, log] = await Promise.all([
          getSharingConsent().catch(() => null),
          getConsentPolicies().catch(() => null),
          listRecordAccessLog().catch(() => [] as RecordAccessEntry[]),
        ])
        if (!active) return
        setConsent(sharing)
        setPolicies(policyText)
        setAccessLog(log)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

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
