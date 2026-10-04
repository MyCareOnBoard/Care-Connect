import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react"
import { useSearchParams } from "react-router"
import {
  AlertCircle,
  AlertTriangle,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Coins,
  Gift,
  Loader2,
  Menu,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { holdDescription } from "@/utils/careconnect/creatorHold"
import { GiftCatalogManager } from "@/components/cowry/GiftCatalogManager"
import { AdminGiftAnalytics } from "@/components/cowry/AdminGiftAnalytics"
import { COWRY_TABS, useAdminNav, type CowryTabKey } from "@/components/admin/adminNav"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { CowryIcon } from "@/components/cowry/CowryIcon"
import { AnimatedCowries, CowryProgress } from "@/components/cowry/CowryUI"
import { celebrateCowries } from "@/components/cowry/celebrate"
import { cn } from "@/lib/utils"
import { getAuthErrorMessage, useAuthUser } from "@/utils/auth"
import { formatRelative, toDate, type Timestampish } from "@/utils/careconnect/types"
import { formatCowries } from "@/utils/careconnect/cowry"
import { listTopGifts } from "@/utils/careconnect/services/cowryService"
import {
  getAdminConfig,
  listChangeLog,
  listMismatches,
  runReconciliation,
  savePackage,
  updateMismatch,
  updatePools,
  updatePricing,
  updateGifts,
  updateRewards,
  type CowryActivityType,
  type CowryAdminConfig,
  type CowryConfigChange,
  type CowryDataPackage,
  type CowryMismatch,
  type CowryMismatchKind,
  type CowryPoolType,
} from "@/utils/careconnect/services/cowryAdminService"

/**
 * Cowry economy administration.
 *
 * Four things an operator can change without a release, and the log of every change ever
 * made. The log is not a tab that could be dropped for time: without it, a rate change is
 * untraceable, and an economy nobody can audit is one nobody should be allowed to edit.
 *
 * Every field here is money. The screen reads like a spreadsheet, and a field that has been
 * edited is highlighted with the live value beside it, so the operator sees what it is and
 * what it would become before pressing save. Save stays off until something has changed.
 */

type TabKey = CowryTabKey
const TABS = COWRY_TABS

const POOL_LABELS: Record<CowryPoolType, string> = {
  daily_engagement: "Daily engagement",
  creator_activity: "Creator activity",
  referral: "Referrals",
  health_education: "Health education",
  sponsored_brand: "Sponsored brand",
  special_event: "Special event",
}

const ACTIVITY_LABELS: Record<CowryActivityType, string> = {
  complete_profile: "Complete profile",
  daily_visit: "Daily visit",
  comment: "Comment",
  post: "Post",
  video: "Video",
  challenge: "Health challenge",
  referral: "Referral",
  weekly_streak: "Weekly streak",
  video_milestone: "Video milestone",
}

const number = (value: number | null | undefined) => (value ?? 0).toLocaleString("en-US")

const MISMATCH_LABELS: Record<CowryMismatchKind, string> = {
  late_delivery: "Delivered after refund",
  missing_delivery: "Charged, no delivery on record",
  balance_drift: "Balance disagreed with ledger",
  stuck_reservation: "Held past the window",
  payment_unmatched: "Payment with no purchase",
}

/**
 * Which findings need a person.
 *
 * The two the system settles itself are shown resolved rather than hidden — the record of
 * what it did is the point, and a queue that only shows problems hides the corrections.
 */
const NEEDS_A_PERSON = new Set<CowryMismatchKind>([
  "missing_delivery",
  "stuck_reservation",
  "payment_unmatched",
])

/** How long a save confirmation stays before it clears itself. */
const NOTICE_MS = 6000

/** Renders a log value, including the null that means "was never set". */
function logValue(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "number") return value.toLocaleString("en-US")
  return String(value)
}

/** One line of the "about to change" summary shown before a save. */
interface ChangeRow {
  label: string
  from: string
  to: string
  /** Set when the change is big enough to deserve a second look. */
  warn?: string
}

const shown = (value: string, empty = "not set") => (value === "" ? empty : Number(value).toLocaleString("en-US"))

/** A change of half or more either way, on a value that was already set, gets flagged. */
function jumpWarning(from: string, to: string): string | undefined {
  const a = Number(from)
  const b = Number(to)
  if (from === "" || to === "" || !Number.isFinite(a) || !Number.isFinite(b) || a <= 0) return undefined
  const change = (b - a) / a
  if (Math.abs(change) < 0.5) return undefined
  return `${change > 0 ? "Up" : "Down"} ${Math.round(Math.abs(change) * 100)}%`
}

/**
 * The money in a reconciliation finding, when its detail carries one. The detail is free-form
 * per kind, so this looks for the names the sweep uses and says nothing rather than guess.
 */
function findingAmount(detail: Record<string, unknown> | null | undefined): string | null {
  if (!detail) return null
  for (const key of ["nairaAmount", "amountNaira", "naira"]) {
    const value = detail[key]
    if (typeof value === "number") return `₦${value.toLocaleString("en-US")}`
  }
  for (const key of ["amount", "cowries", "cowryAmount", "cost", "delta", "difference"]) {
    const value = detail[key]
    if (typeof value === "number") return `${value.toLocaleString("en-US")} Cowries`
  }
  return null
}

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** How many unsaved edits each section holds. */
function dirtyCounts(
  config: CowryAdminConfig,
  drafts: {
    pools: Record<string, string>
    rewards: Record<string, string>
    caps: Record<string, string>
    pricing: Record<string, string>
    gifts: Record<string, string>
    packages: Record<string, Record<string, string>>
  },
): Partial<Record<CowryTabKey, number>> {
  const liveHold = String(config.gifts?.creatorHoldMinutes ?? "")
  return {
    pools: changedKeys(drafts.pools, poolLive(config)).length,
    rewards: changedKeys(drafts.rewards, rewardLive(config)).length + changedKeys(drafts.caps, capLive(config)).length,
    pricing: changedKeys(drafts.pricing, pricingLive(config)).length,
    gifts: (drafts.gifts.creatorHoldMinutes ?? "") !== liveHold ? 1 : 0,
    packages: config.packages.filter((pkg) => {
      const draft = drafts.packages[pkg.id]
      if (!draft) return false
      return (
        (draft.cowryCost ?? String(pkg.cowryCost)) !== String(pkg.cowryCost) ||
        (draft.supplierNairaCost ?? String(pkg.supplierNairaCost ?? "")) !== String(pkg.supplierNairaCost ?? "")
      )
    }).length,
  }
}

/** The fields in a draft whose value differs from what is live. */
function changedKeys(draft: Record<string, string>, live: Record<string, string>): string[] {
  return Object.keys(draft).filter((key) => (draft[key] ?? "") !== (live[key] ?? ""))
}

function poolLive(config: CowryAdminConfig) {
  return Object.fromEntries(Object.entries(config.pools).map(([k, v]) => [k, String(v ?? 0)]))
}
function rewardLive(config: CowryAdminConfig) {
  return Object.fromEntries(
    Object.entries(config.rewards.baseValues).map(([k, v]) => [k, String(v ?? 0)]),
  )
}
function capLive(config: CowryAdminConfig) {
  return Object.fromEntries(
    Object.entries(config.rewards.dailyCaps).map(([k, v]) => [k, v === null || v === undefined ? "" : String(v)]),
  )
}
function pricingLive(config: CowryAdminConfig) {
  return {
    cowryNairaValue:
      config.pricing.cowryNairaValue === null ? "" : String(config.pricing.cowryNairaValue),
    depositFeeRate: String(config.pricing.depositFeeRate),
    withdrawalFeeRate: String(config.pricing.withdrawalFeeRate),
  }
}

function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tint,
}: {
  label: string
  value: ReactNode
  hint?: string
  icon: LucideIcon
  tint: string
}) {
  return (
    <div className="cowry-lift rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[#4f4f4f]">{label}</p>
        <span className={cn("flex size-9 items-center justify-center rounded-xl", tint)}>
          <Icon className="size-4.5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-[#10141a]">{value}</p>
      {hint && <p className="mt-1 text-xs text-[#6b7280]">{hint}</p>}
    </div>
  )
}

/**
 * A number input that shows when it no longer matches what is live.
 *
 * The highlight and the "was" line are the point: they are what lets an operator review a
 * multi-field save before making it, rather than trusting their own typing.
 */
function DraftInput({
  value,
  live,
  onChange,
  className,
  liveLabel,
  ...props
}: Omit<ComponentProps<typeof Input>, "value" | "onChange"> & {
  value: string
  live: string
  onChange: (value: string) => void
  liveLabel?: (live: string) => string
}) {
  const dirty = value !== live
  return (
    <div>
      <Input
        type="number"
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "transition-colors",
          dirty && "border-amber-400 bg-amber-50 ring-2 ring-amber-200/60",
          className,
        )}
      />
      {dirty && (
        <p className="animate-fadeIn mt-1 text-[11px] text-amber-800">
          was {liveLabel ? liveLabel(live) : live === "" ? "not set" : Number(live).toLocaleString("en-US")}
        </p>
      )}
    </div>
  )
}

/** Save and reset for a form section, with how many values the save would change. */
function SaveBar({
  dirtyCount,
  saving,
  onSave,
  onReset,
  label,
}: {
  dirtyCount: number
  saving: boolean
  onSave: () => void
  onReset: () => void
  label: string
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <Button disabled={saving || dirtyCount === 0} onClick={onSave}>
        {saving ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Save className="size-4" aria-hidden="true" />
        )}
        {label}
      </Button>
      {dirtyCount > 0 && (
        <>
          <span className="animate-fadeIn rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            {dirtyCount} unsaved change{dirtyCount === 1 ? "" : "s"}
          </span>
          <Button variant="ghost" size="sm" onClick={onReset} disabled={saving}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset
          </Button>
        </>
      )}
    </div>
  )
}

function ConsoleSkeleton() {
  return (
    <div className="space-y-6 pb-10">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <Skeleton className="h-10 w-full rounded-full" />
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  )
}

export default function AdminCowryPage() {
  // The open tab lives in the address, so a refresh or a shared link lands in the same place.
  const [params, setParams] = useSearchParams()
  const tabParam = params.get("tab")
  const activeTab: TabKey = TABS.some((tab) => tab.key === tabParam) ? (tabParam as TabKey) : "pools"
  const setActiveTab = (key: TabKey) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.set("tab", key)
        return next
      },
      { replace: true },
    )

  const [config, setConfig] = useState<CowryAdminConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const [mismatches, setMismatches] = useState<CowryMismatch[] | null>(null)
  const [changeLog, setChangeLog] = useState<CowryConfigChange[] | null>(null)
  const [running, setRunning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busyRow, setBusyRow] = useState<string | null>(null)
  const [confirmResolve, setConfirmResolve] = useState<string | null>(null)

  // "Take" assigns to whoever is looking at the queue, so an item cannot be claimed
  // on someone else's behalf by accident.
  const { user } = useAuthUser()
  const currentStaffUid = user?.uid ?? null

  // Drafts, so a form shows what the operator typed rather than snapping back on refetch.
  const [poolDraft, setPoolDraft] = useState<Record<string, string>>({})
  const [rewardDraft, setRewardDraft] = useState<Record<string, string>>({})
  const [capDraft, setCapDraft] = useState<Record<string, string>>({})
  const [pricingDraft, setPricingDraft] = useState<Record<string, string>>({})
  const [giftDraft, setGiftDraft] = useState<Record<string, string>>({})
  const [packageDraft, setPackageDraft] = useState<Record<string, Record<string, string>>>({})
  const [notice, setNotice] = useState<{ tone: "ok" | "info"; text: string } | null>(null)
  // A money change waiting on "Confirm".
  const [pendingSave, setPendingSave] = useState<{ title: string; rows: ChangeRow[]; run: () => Promise<unknown> } | null>(null)
  // Reconciliation and change-log views.
  const [findingFilter, setFindingFilter] = useState<"all" | "open" | "resolved">("all")
  const [findingKind, setFindingKind] = useState<CowryMismatchKind | "all">("all")
  const [detailItem, setDetailItem] = useState<CowryMismatch | null>(null)
  const [logSetting, setLogSetting] = useState("all")
  const [logPerson, setLogPerson] = useState("all")
  const [logFrom, setLogFrom] = useState("")
  const [logTo, setLogTo] = useState("")
  // Today's gifting, for the header.
  const [giftsToday, setGiftsToday] = useState<{ count: number; capped: boolean; biggest: string | null } | null>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadConfig = useCallback(async () => {
    try {
      const next = await getAdminConfig()
      setConfig(next)
      setFailed(false)
      return next
    } catch {
      setFailed(true)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadConfig()
  }, [loadConfig])

  useEffect(() => {
    listTopGifts({ limit: 1, window: "24h" })
      .then((board) => {
        const top = board.gifts[0]
        setGiftsToday({
          count: board.scanned,
          capped: board.scanCapped,
          biggest: top ? `${top.giftLabel} · ${formatCowries(top.cost)}` : null,
        })
      })
      .catch(() => setGiftsToday(null))
  }, [])

  const filteredLog = useMemo(() => {
    const from = logFrom ? new Date(`${logFrom}T00:00:00`) : null
    const to = logTo ? new Date(`${logTo}T23:59:59`) : null
    return (changeLog ?? []).filter((row) => {
      if (logSetting !== "all" && row.configKey !== logSetting) return false
      if (logPerson !== "all" && (row.staffName ?? row.staffUid ?? "") !== logPerson) return false
      const at = toDate(row.at as Timestampish)
      if (from && (!at || at < from)) return false
      if (to && (!at || at > to)) return false
      return true
    })
  }, [changeLog, logSetting, logPerson, logFrom, logTo])

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current)
    },
    [],
  )

  function showNotice(text: string, tone: "ok" | "info" = "ok") {
    setNotice({ tone, text })
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(null), NOTICE_MS)
  }

  // Seed the drafts whenever the server view changes, so an edit starts from what is live.
  useEffect(() => {
    if (!config) return
    setPoolDraft(poolLive(config))
    setRewardDraft(rewardLive(config))
    setCapDraft(capLive(config))
    setPricingDraft(pricingLive(config))
    setGiftDraft({ creatorHoldMinutes: String(config.gifts?.creatorHoldMinutes ?? "") })
    setPackageDraft({})
  }, [config])

  // The two queues load on demand rather than up front — an operator editing rates has no
  // reason to pull a hundred reconciliation rows.
  useEffect(() => {
    if (activeTab !== "reconciliation") return
    listMismatches({ limit: 100 })
      .then(setMismatches)
      .catch((error) => toast.error(getAuthErrorMessage(error)))
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== "log") return
    listChangeLog({ limit: 100 })
      .then(setChangeLog)
      .catch((error) => toast.error(getAuthErrorMessage(error)))
  }, [activeTab])

  /**
   * Run a write, report what actually changed, and refresh.
   *
   * Reports the honest "nothing did" rather than a success message for a no-op save: an
   * operator who mistypes and re-saves the same value should not be told it took.
   */
  async function save(action: () => Promise<{ changed: boolean; changes: Array<unknown> }>) {
    setSaving(true)
    try {
      const result = await action()
      if (result.changed) {
        showNotice(
          `Saved. ${result.changes.length} value${result.changes.length === 1 ? "" : "s"} changed and recorded in the log.`,
        )
      } else {
        showNotice("Nothing changed, so nothing was recorded.", "info")
      }
      await loadConfig()
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  /** Show what a save would change, old to new, and only run it once confirmed. */
  function requestSave(title: string, rows: ChangeRow[], run: () => Promise<unknown>) {
    if (rows.length === 0) return
    setPendingSave({ title, rows, run })
  }

  function exportLog() {
    const header = ["When", "Setting", "Field", "Old value", "New value", "Changed by", "IP address"]
    const lines = filteredLog.map((row) =>
      [
        toDate(row.at as Timestampish)?.toISOString() ?? "",
        row.configKey,
        row.field,
        logValue(row.oldValue),
        logValue(row.newValue),
        row.staffName ?? row.staffUid ?? "",
        row.ipAddress ?? "",
      ]
        .map(csvCell)
        .join(","),
    )
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `cowry-change-log-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function mismatchAction(id: string, run: () => Promise<unknown>, message: string) {
    setBusyRow(id)
    try {
      await run()
      showNotice(message)
      setMismatches(await listMismatches({ limit: 100 }))
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setBusyRow(null)
      setConfirmResolve(null)
    }
  }

  // Tell the sidebar (phones and tablets) what is waiting in each section.
  const adminNav = useAdminNav()
  const setNavBadges = adminNav?.setBadges
  useEffect(() => {
    if (!setNavBadges) return
    const dirty = config
      ? dirtyCounts(config, {
          pools: poolDraft,
          rewards: rewardDraft,
          caps: capDraft,
          pricing: pricingDraft,
          gifts: giftDraft,
          packages: packageDraft,
        })
      : {}
    const open = mismatches?.filter((m) => m.status !== "resolved").length ?? 0
    setNavBadges({
      ...Object.fromEntries(Object.entries(dirty).map(([key, value]) => [key, { dirty: value }])),
      reconciliation: { count: open },
    })
  }, [setNavBadges, config, poolDraft, rewardDraft, capDraft, pricingDraft, giftDraft, packageDraft, mismatches])
  useEffect(() => () => setNavBadges?.({}), [setNavBadges])

  if (loading) return <ConsoleSkeleton />

  if (failed || !config) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">Couldn&apos;t load the Cowry settings.</p>
          <p className="mt-1">
            These endpoints require super admin with MFA satisfied. Retry, or re-authenticate
            if your session has aged out.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 border-red-200 bg-white"
            onClick={() => {
              setLoading(true)
              void loadConfig()
            }}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const impliedCost = config.impliedNairaPerCowry
  const issuedToday = config.poolUsage.reduce((sum, pool) => sum + pool.issued, 0)
  const openFindings = mismatches?.filter((m) => m.status !== "resolved").length ?? null

  const livePools = poolLive(config)
  const liveRewards = rewardLive(config)
  const liveCaps = capLive(config)
  const livePricing = pricingLive(config)
  const poolDirty = changedKeys(poolDraft, livePools).length
  const rewardDirty = changedKeys(rewardDraft, liveRewards).length + changedKeys(capDraft, liveCaps).length
  const pricingDirty = changedKeys(pricingDraft, livePricing).length
  const liveHold = String(config.gifts?.creatorHoldMinutes ?? "")
  const holdDirty = (giftDraft.creatorHoldMinutes ?? "") !== liveHold ? 1 : 0
  const dirtyByTab = dirtyCounts(config, {
    pools: poolDraft,
    rewards: rewardDraft,
    caps: capDraft,
    pricing: pricingDraft,
    gifts: giftDraft,
    packages: packageDraft,
  })

  const allFindings = mismatches ?? []
  const visibleFindings = allFindings.filter(
    (item) =>
      (findingFilter === "all" || (findingFilter === "resolved" ? item.status === "resolved" : item.status !== "resolved")) &&
      (findingKind === "all" || item.kind === findingKind),
  )
  const logSettings = [...new Set((changeLog ?? []).map((row) => row.configKey))].sort()
  const logPeople = [...new Set((changeLog ?? []).map((row) => row.staffName ?? row.staffUid ?? "").filter(Boolean))].sort()

  const depositRate = Number(pricingDraft.depositFeeRate || 0)
  const withdrawalRate = Number(pricingDraft.withdrawalFeeRate || 0)
  const pct = (rate: string) => `${(Number(rate || 0) * 100).toFixed(1).replace(/\.0$/, "")}%`

  return (
    <div className="animate-fade-in-up pb-10">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <span className="cowry-hover flex size-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
          <CowryIcon size={36} className="cowry-wobble" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold leading-tight text-[#10141a] sm:text-[36px]">Cowry economy</h1>
          <p className="text-[#4f4f4f]">
            Budgets, reward rates, pricing and the data catalogue. Every change is recorded
            against you, with its old and new value.
          </p>
        </div>
      </div>

      <div className="cowry-stagger mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Cowry value"
          icon={Coins}
          tint="bg-[#fff4df] text-[#c8963e]"
          value={config.pricing.cowryNairaValue === null ? "Not set" : `₦${config.pricing.cowryNairaValue}`}
          hint={config.pricing.cowryNairaValue === null ? "Finance has not set this yet" : undefined}
        />
        <Stat
          label="Implied cost per Cowry"
          icon={TrendingUp}
          tint="bg-[#e0f2ff] text-[#0d8de0]"
          value={impliedCost === null ? "—" : `₦${impliedCost.toFixed(4)}`}
          hint="Derived from supplier prices, not configured"
        />
        <Stat
          label="Issued today"
          icon={Sparkles}
          tint="bg-[#e6f8f8] text-[#00868a]"
          value={<AnimatedCowries value={issuedToday} />}
          hint="Across every budget pool"
        />
        <Stat
          label="Gifts sent today"
          icon={Gift}
          tint="bg-[#fff1c7] text-[#a8793f]"
          value={giftsToday ? `${formatCowries(giftsToday.count)}${giftsToday.capped ? "+" : ""}` : "—"}
          hint={giftsToday?.biggest ? `Biggest: ${giftsToday.biggest}` : giftsToday ? "None yet in the last 24 hours" : "Could not load"}
        />
      </div>

      {/* Phones and tablets: the sections live in the sidebar; this says where you are. */}
      {(() => {
        const current = TABS.find((tab) => tab.key === activeTab) ?? TABS[0]
        const CurrentIcon = current.icon
        const waiting = Object.values(dirtyByTab).some((count) => (count ?? 0) > 0)
        return (
          <button
            type="button"
            onClick={() => adminNav?.openNav()}
            className="sticky top-[60px] z-30 mb-6 flex w-full items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 text-left shadow-sm ring-1 ring-gray-200 backdrop-blur-md transition hover:bg-white lg:hidden"
            aria-label={`Section: ${current.label}. Open the section menu`}
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#e6f8f8] text-[#00868a]">
              <CurrentIcon className="size-4.5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-[#6b7280]">Section</span>
              <span className="block truncate font-semibold text-[#10141a]">{current.label}</span>
            </span>
            {waiting && <span className="size-2 rounded-full bg-amber-400" aria-label="Unsaved changes elsewhere" />}
            <Menu className="size-5 text-[#4f4f4f]" aria-hidden="true" />
          </button>
        )
      })()}

      <div
        role="tablist"
        aria-label="Cowry settings"
        className="scrollbar-hide sticky top-[60px] z-30 mb-6 hidden gap-2 lg:flex overflow-x-auto rounded-full bg-white/95 p-1.5 shadow-sm ring-1 ring-gray-200 backdrop-blur-md"
      >
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setActiveTab(key)
                setNotice(null)
                setConfirmResolve(null)
              }}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                active ? "bg-[#00b3ad] text-white shadow" : "text-[#4f4f4f] hover:bg-gray-100",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
              {(dirtyByTab[key] ?? 0) > 0 && (
                // Edits survive switching tabs; this says some are still waiting to be saved.
                <span
                  className={cn("size-2 rounded-full", active ? "bg-white" : "bg-amber-400")}
                  title={`${dirtyByTab[key]} unsaved change${dirtyByTab[key] === 1 ? "" : "s"}`}
                  aria-label="Unsaved changes"
                />
              )}
              {key === "reconciliation" && openFindings !== null && openFindings > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs font-bold",
                    active ? "bg-white/25 text-white" : "bg-red-100 text-red-700",
                  )}
                >
                  {openFindings}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {notice && (
        <div
          role="status"
          className={cn(
            "animate-fade-in-up mb-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm",
            notice.tone === "ok"
              ? "border-[#b8e6e4] bg-[#eefbfa] text-[#0f5f5c]"
              : "border-gray-200 bg-gray-50 text-[#4f4f4f]",
          )}
        >
          {notice.tone === "ok" && <CheckCircle2 className="animate-check-pop size-4 shrink-0" aria-hidden="true" />}
          <span className="flex-1">{notice.text}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="rounded p-0.5 opacity-60 transition hover:opacity-100"
            aria-label="Dismiss"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ── pools ──────────────────────────────────────────────────────── */}
      {activeTab === "pools" && (
        <section key="pools" className="animate-fade-in-up rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-[#10141a]">Daily issuing ceilings</h2>
          <p className="mt-1 text-sm text-[#4f4f4f]">
            When a pool reaches its ceiling it stops paying for the day and tells the user
            plainly. It never quietly pays less.
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="admin-table w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-[#6b7280]">
                <tr>
                  <th className="py-3 pr-4 font-semibold">Pool</th>
                  <th className="min-w-48 py-3 pr-4 font-semibold">Issued today</th>
                  <th className="py-3 pr-4 font-semibold">Daily ceiling</th>
                  <th className="py-3 font-semibold">State</th>
                </tr>
              </thead>
              <tbody className="cowry-stagger">
                {config.poolUsage.map((pool) => {
                  const used = pool.limit > 0 ? (pool.issued / pool.limit) * 100 : 0
                  return (
                    <tr key={pool.poolType} className="border-b border-gray-100 align-top last:border-0">
                      <td data-label="Pool" className="py-3 pr-4 font-medium">{POOL_LABELS[pool.poolType]}</td>
                      <td data-label="Issued today" className="py-3 pr-4">
                        <span className="tabular-nums text-[#4f4f4f]">
                          {number(pool.issued)}
                          <span className="text-[#9aa4b2]"> / {number(pool.limit)}</span>
                        </span>
                        <CowryProgress
                          value={used}
                          tone={pool.exhausted ? "orange" : used > 80 ? "gold" : "teal"}
                          label={`${POOL_LABELS[pool.poolType]} usage`}
                          className="mt-1.5 h-1.5 max-w-40"
                        />
                      </td>
                      <td data-label="Daily ceiling" className="py-3 pr-4">
                        <DraftInput
                          min={0}
                          className="w-40"
                          aria-label={`${POOL_LABELS[pool.poolType]} daily ceiling`}
                          value={poolDraft[pool.poolType] ?? ""}
                          live={livePools[pool.poolType] ?? ""}
                          onChange={(value) => setPoolDraft((d) => ({ ...d, [pool.poolType]: value }))}
                        />
                      </td>
                      <td data-label="State" className="py-3">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-semibold",
                            pool.exhausted ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700",
                          )}
                        >
                          {pool.exhausted ? "Exhausted" : `${number(pool.remaining)} left`}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <SaveBar
            label="Save ceilings"
            dirtyCount={poolDirty}
            saving={saving}
            onReset={() => setPoolDraft(livePools)}
            onSave={() =>
              requestSave(
                "Save daily ceilings",
                changedKeys(poolDraft, livePools).map((key) => ({
                  label: POOL_LABELS[key as CowryPoolType] ?? key,
                  from: shown(livePools[key] ?? ""),
                  to: shown(poolDraft[key] ?? ""),
                  warn: jumpWarning(livePools[key] ?? "", poolDraft[key] ?? ""),
                })),
                () =>
                  save(() =>
                    updatePools(
                      Object.fromEntries(
                        Object.entries(poolDraft)
                          .filter(([, v]) => v !== "")
                          .map(([k, v]) => [k, Number(v)]),
                      ),
                    ),
                  ),
              )
            }
          />
        </section>
      )}

      {/* ── rewards ────────────────────────────────────────────────────── */}
      {activeTab === "rewards" && (
        <section key="rewards" className="animate-fade-in-up rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-[#10141a]">What each activity pays</h2>
          <p className="mt-1 text-sm text-[#4f4f4f]">
            Base value before multipliers, and how many times a day it pays. Leave a cap blank
            for no daily limit.
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="admin-table w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-[#6b7280]">
                <tr>
                  <th className="py-3 pr-4 font-semibold">Activity</th>
                  <th className="py-3 pr-4 font-semibold">Cowries</th>
                  <th className="py-3 font-semibold">Daily cap</th>
                </tr>
              </thead>
              <tbody className="cowry-stagger">
                {(Object.keys(ACTIVITY_LABELS) as CowryActivityType[]).map((activity) => (
                  <tr key={activity} className="border-b border-gray-100 align-top last:border-0">
                    <td data-label="Activity" className="py-3 pr-4 font-medium">{ACTIVITY_LABELS[activity]}</td>
                    <td data-label="Cowries" className="py-3 pr-4">
                      <DraftInput
                        min={0}
                        className="w-32"
                        aria-label={`${ACTIVITY_LABELS[activity]} base value`}
                        value={rewardDraft[activity] ?? ""}
                        live={liveRewards[activity] ?? ""}
                        onChange={(value) => setRewardDraft((d) => ({ ...d, [activity]: value }))}
                      />
                    </td>
                    <td data-label="Daily cap" className="py-3">
                      <DraftInput
                        min={0}
                        placeholder="No cap"
                        className="w-32"
                        aria-label={`${ACTIVITY_LABELS[activity]} daily cap`}
                        value={capDraft[activity] ?? ""}
                        live={liveCaps[activity] ?? ""}
                        liveLabel={(live) => (live === "" ? "no cap" : Number(live).toLocaleString("en-US"))}
                        onChange={(value) => setCapDraft((d) => ({ ...d, [activity]: value }))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Multiplier ceilings</p>
            <p className="mt-1">
              Quality {config.rewards.multiplierCeilings.quality}, trust{" "}
              {config.rewards.multiplierCeilings.trust}, campaign{" "}
              {config.rewards.multiplierCeilings.campaign}. These may be tightened but never
              raised past the engine&apos;s own limits — a higher value is rejected rather than
              silently clamped, so the mistake surfaces here rather than in a payout.
            </p>
          </div>

          <SaveBar
            label="Save rates"
            dirtyCount={rewardDirty}
            saving={saving}
            onReset={() => {
              setRewardDraft(liveRewards)
              setCapDraft(liveCaps)
            }}
            onSave={() =>
              requestSave(
                "Save reward rates",
                [
                  ...changedKeys(rewardDraft, liveRewards).map((key) => ({
                    label: ACTIVITY_LABELS[key as CowryActivityType] ?? key,
                    from: shown(liveRewards[key] ?? ""),
                    to: shown(rewardDraft[key] ?? ""),
                    warn: jumpWarning(liveRewards[key] ?? "", rewardDraft[key] ?? ""),
                  })),
                  ...changedKeys(capDraft, liveCaps).map((key) => ({
                    label: `${ACTIVITY_LABELS[key as CowryActivityType] ?? key} daily cap`,
                    from: shown(liveCaps[key] ?? "", "no cap"),
                    to: shown(capDraft[key] ?? "", "no cap"),
                    warn: jumpWarning(liveCaps[key] ?? "", capDraft[key] ?? ""),
                  })),
                ],
                () => save(() =>
                updateRewards({
                  baseValues: Object.fromEntries(
                    Object.entries(rewardDraft)
                      .filter(([, v]) => v !== "")
                      .map(([k, v]) => [k, Number(v)]),
                  ),
                  // An empty cap means "no daily limit", which is null rather than zero —
                  // zero would stop the activity paying at all.
                  dailyCaps: Object.fromEntries(
                    Object.entries(capDraft).map(([k, v]) => [k, v === "" ? null : Number(v)]),
                  ),
                }),
              ),
              )
            }
          />
        </section>
      )}

      {/* ── gifts ──────────────────────────────────────────────────────── */}
      {activeTab === "gifts" && (
        <div key="gifts" className="animate-fade-in-up grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <GiftCatalogManager />

          {/* The one gift setting that is not about a single gift, beside the catalogue
              rather than above it — the catalogue is what an operator comes here for. */}
          <aside className="space-y-4 lg:sticky lg:top-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold text-[#10141a]">
                <Clock className="size-4 text-[#00868a]" aria-hidden="true" />
                Creator hold
              </h2>
              <p className="mt-1 text-sm text-[#4f4f4f]">
                How long a creator waits before a gift they received becomes spendable.
              </p>

              <label htmlFor="creator-hold" className="mt-4 block text-sm font-medium text-[#10141a]">
                Minutes
              </label>
              <DraftInput
                id="creator-hold"
                min={0}
                max={525600}
                step={1}
                className="mt-1.5"
                value={giftDraft.creatorHoldMinutes ?? ""}
                live={liveHold}
                liveLabel={(live) => (live === "" ? "not set" : holdDescription(live))}
                onChange={(value) => setGiftDraft((d) => ({ ...d, creatorHoldMinutes: value }))}
              />
              <p className="mt-1 text-xs text-[#6b7280]">{holdDescription(giftDraft.creatorHoldMinutes)}</p>

              <SaveBar
                label="Save hold"
                dirtyCount={holdDirty}
                saving={saving}
                onReset={() => setGiftDraft({ creatorHoldMinutes: liveHold })}
                onSave={() =>
                  requestSave(
                    "Save the creator hold",
                    [
                      {
                        label: "Creator hold",
                        from: liveHold === "" ? "not set" : holdDescription(liveHold),
                        to: holdDescription(giftDraft.creatorHoldMinutes),
                        warn:
                          Number(giftDraft.creatorHoldMinutes) < 43200
                            ? "Shorter than the 30-day chargeback window"
                            : undefined,
                      },
                    ],
                    () => save(() => updateGifts({ creatorHoldMinutes: Number(giftDraft.creatorHoldMinutes) })),
                  )
                }
              />
            </section>

            {/* The hold is not an arbitrary delay, and an operator shortening it should
                know what it is protecting. */}
            <div className="rounded-2xl bg-gray-50 p-4 text-sm text-[#4f4f4f] ring-1 ring-gray-200">
              <p className="font-semibold text-[#10141a]">What the hold is for</p>
              <p className="mt-1">
                A gift is bought with purchased Cowries, and that purchase can still be charged
                back. The hold is the window in which that can be unwound before the creator has
                spent the proceeds. 43,200 minutes &mdash; thirty days &mdash; is the production
                setting.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Two things that surprise people</p>
              <p className="mt-1">
                The release sweep runs every fifteen minutes, so a hold shorter than that is
                effectively fifteen &mdash; setting 5 does not release in 5.
              </p>
              <p className="mt-2">
                A gift&apos;s release date is stamped when it is sent, so shortening the hold does
                not free gifts already held. Send a new gift to see the change.
              </p>
            </div>
          </aside>
        </div>
      )}

      {/* ── pricing ────────────────────────────────────────────────────── */}
      {activeTab === "pricing" && (
        <section key="pricing" className="animate-fade-in-up grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-[#10141a]">Pricing and fees</h2>
            <p className="mt-1 text-sm text-[#4f4f4f]">
              Fee rates are decimals: 0.1 is 10%. The withdrawal rate also applies to converting
              purchased Cowries into data.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="cowry-value" className="text-sm font-medium text-[#10141a]">
                  Cowry value in naira
                </label>
                <DraftInput
                  id="cowry-value"
                  step="0.01"
                  min={0}
                  placeholder="Not set"
                  className="mt-1.5"
                  value={pricingDraft.cowryNairaValue ?? ""}
                  live={livePricing.cowryNairaValue}
                  liveLabel={(live) => (live === "" ? "not set" : `₦${live}`)}
                  onChange={(value) => setPricingDraft((d) => ({ ...d, cowryNairaValue: value }))}
                />
                <p className="mt-1 text-xs text-[#6b7280]">
                  Leave blank until finance sets it. A placeholder number here would look
                  authoritative everywhere it is shown.
                </p>
              </div>

              <div>
                <label htmlFor="deposit-fee" className="flex justify-between text-sm font-medium text-[#10141a]">
                  Deposit fee (buying Cowries)
                  <span className="tabular-nums text-[#00868a]">{pct(pricingDraft.depositFeeRate)}</span>
                </label>
                <DraftInput
                  id="deposit-fee"
                  step="0.01"
                  min={0}
                  max={0.5}
                  className="mt-1.5"
                  value={pricingDraft.depositFeeRate ?? ""}
                  live={livePricing.depositFeeRate}
                  liveLabel={(live) => `${live} (${pct(live)})`}
                  onChange={(value) => setPricingDraft((d) => ({ ...d, depositFeeRate: value }))}
                />
              </div>

              <div>
                <label
                  htmlFor="withdrawal-fee"
                  className="flex justify-between gap-3 text-sm font-medium text-[#10141a]"
                >
                  Withdrawal fee (cash out, and data from purchased Cowries)
                  <span className="shrink-0 tabular-nums text-[#00868a]">{pct(pricingDraft.withdrawalFeeRate)}</span>
                </label>
                <DraftInput
                  id="withdrawal-fee"
                  step="0.01"
                  min={0}
                  max={0.5}
                  className="mt-1.5"
                  value={pricingDraft.withdrawalFeeRate ?? ""}
                  live={livePricing.withdrawalFeeRate}
                  liveLabel={(live) => `${live} (${pct(live)})`}
                  onChange={(value) => setPricingDraft((d) => ({ ...d, withdrawalFeeRate: value }))}
                />
              </div>
            </div>

            <SaveBar
              label="Save pricing"
              dirtyCount={pricingDirty}
              saving={saving}
              onReset={() => setPricingDraft(livePricing)}
              onSave={() =>
                requestSave(
                  "Save pricing and fees",
                  changedKeys(pricingDraft, livePricing).map((key) => {
                    const fee = key !== "cowryNairaValue"
                    const label =
                      key === "cowryNairaValue" ? "Cowry value" : key === "depositFeeRate" ? "Deposit fee" : "Withdrawal fee"
                    const from = livePricing[key as keyof typeof livePricing] ?? ""
                    const to = pricingDraft[key] ?? ""
                    return {
                      label,
                      from: fee ? pct(from) : from === "" ? "not set" : `₦${from}`,
                      to: fee ? pct(to) : to === "" ? "not set" : `₦${to}`,
                      warn: fee && Number(to) > 0.25 ? "Above 25%" : jumpWarning(from, to),
                    }
                  }),
                  () => save(() =>
                  updatePricing({
                    cowryNairaValue:
                      pricingDraft.cowryNairaValue === "" ? null : Number(pricingDraft.cowryNairaValue),
                    depositFeeRate: Number(pricingDraft.depositFeeRate),
                    withdrawalFeeRate: Number(pricingDraft.withdrawalFeeRate),
                  }),
                ),
                )
              }
            />
          </div>

          {/* The round trip, shown because a user who discovers it at withdrawal reads it as
              a trick. Worth an operator seeing the same number, as it would change. */}
          <div className="self-start rounded-2xl border border-gray-200 bg-white p-6">
            <p className="font-semibold text-[#10141a]">Round trip at these rates</p>
            <p className="mt-1 text-xs text-[#6b7280]">Updates as you type.</p>
            <ol className="mt-5 space-y-3 text-sm">
              {[
                { label: "User pays", value: 1000, tone: "text-[#10141a]" },
                { label: "Arrives as Cowries worth", value: 1000 * (1 - depositRate), tone: "text-[#10141a]" },
                {
                  label: "Comes back out as",
                  value: 1000 * (1 - depositRate) * (1 - withdrawalRate),
                  tone: "text-[#d97a2b]",
                },
              ].map((row, index) => (
                <li key={row.label} className="flex items-center gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-[#4f4f4f]">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-[#4f4f4f]">{row.label}</span>
                  <span className={cn("font-bold tabular-nums", row.tone)}>₦{row.value.toFixed(2)}</span>
                </li>
              ))}
            </ol>
            <CowryProgress
              value={(1 - depositRate) * (1 - withdrawalRate) * 100}
              tone="gold"
              label="Share of the original naira a full round trip returns"
              className="mt-5"
            />
            <p className="mt-2 text-xs text-[#6b7280]">
              {((1 - depositRate) * (1 - withdrawalRate) * 100).toFixed(1)}% of what goes in comes back out.
            </p>
          </div>
        </section>
      )}

      {/* ── packages ───────────────────────────────────────────────────── */}
      {activeTab === "packages" && (
        <section key="packages" className="animate-fade-in-up rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-[#10141a]">Data packages</h2>
          <p className="mt-1 text-sm text-[#4f4f4f]">
            Changing a price changes what every user pays on their next redemption. Supplier
            cost feeds the implied cost per Cowry shown above.
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="admin-table w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-[#6b7280]">
                <tr>
                  <th className="py-3 pr-4 font-semibold">Package</th>
                  <th className="py-3 pr-4 font-semibold">Cowry cost</th>
                  <th className="py-3 pr-4 font-semibold">Supplier cost (₦)</th>
                  <th className="py-3 font-semibold" />
                </tr>
              </thead>
              <tbody className="cowry-stagger">
                {config.packages.map((pkg: CowryDataPackage) => {
                  const draft = packageDraft[pkg.id] ?? {}
                  const liveCost = String(pkg.cowryCost)
                  const liveSupplier = String(pkg.supplierNairaCost ?? "")
                  const cost = draft.cowryCost ?? liveCost
                  const supplier = draft.supplierNairaCost ?? liveSupplier
                  const dirty = cost !== liveCost || supplier !== liveSupplier
                  const busy = busyRow === `pkg:${pkg.id}`
                  return (
                    <tr key={pkg.id} className="border-b border-gray-100 align-top last:border-0">
                      <td data-label="Package" className="py-3 pr-4 font-medium">
                        {pkg.label}
                        <span className="ml-2 font-mono text-xs text-[#6b7280]">{pkg.id}</span>
                        {pkg.active === false && (
                          <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-[#6b7280]">
                            inactive
                          </span>
                        )}
                      </td>
                      <td data-label="Cowry cost" className="py-3 pr-4">
                        <DraftInput
                          min={1}
                          className="w-32"
                          aria-label={`${pkg.label} Cowry cost`}
                          value={cost}
                          live={liveCost}
                          onChange={(value) =>
                            setPackageDraft((d) => ({ ...d, [pkg.id]: { ...d[pkg.id], cowryCost: value } }))
                          }
                        />
                      </td>
                      <td data-label="Supplier cost" className="py-3 pr-4">
                        <DraftInput
                          step="0.01"
                          min={0}
                          placeholder="Unknown"
                          className="w-32"
                          aria-label={`${pkg.label} supplier cost`}
                          value={supplier}
                          live={liveSupplier}
                          liveLabel={(live) => (live === "" ? "unknown" : `₦${live}`)}
                          onChange={(value) =>
                            setPackageDraft((d) => ({
                              ...d,
                              [pkg.id]: { ...d[pkg.id], supplierNairaCost: value },
                            }))
                          }
                        />
                      </td>
                      <td data-label="" className="py-3">
                        <Button
                          variant={dirty ? "default" : "outline"}
                          size="sm"
                          disabled={!dirty || busy || busyRow !== null}
                          onClick={() =>
                            requestSave(
                              `Save ${pkg.label}`,
                              [
                                ...(cost !== liveCost
                                  ? [{ label: "Cowry cost", from: shown(liveCost), to: shown(cost), warn: jumpWarning(liveCost, cost) }]
                                  : []),
                                ...(supplier !== liveSupplier
                                  ? [
                                      {
                                        label: "Supplier cost",
                                        from: liveSupplier === "" ? "unknown" : `₦${liveSupplier}`,
                                        to: supplier === "" ? "unknown" : `₦${supplier}`,
                                        warn: jumpWarning(liveSupplier, supplier),
                                      },
                                    ]
                                  : []),
                              ],
                              async () => {
                            setBusyRow(`pkg:${pkg.id}`)
                            try {
                              await savePackage(pkg.id, {
                                label: pkg.label,
                                megabytes: pkg.megabytes,
                                cowryCost: Number(cost),
                                supplierNairaCost: supplier === "" ? null : Number(supplier),
                                active: pkg.active !== false,
                              })
                              showNotice(`${pkg.label} saved and recorded in the log.`)
                              await loadConfig()
                            } catch (error) {
                              toast.error(getAuthErrorMessage(error))
                            } finally {
                              setBusyRow(null)
                            }
                              },
                            )
                          }
                        >
                          {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                          Save
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── gift activity ──────────────────────────────────────────────── */}
      {activeTab === "analytics" && (
        <div key="analytics" className="animate-fade-in-up">
          <AdminGiftAnalytics />
        </div>
      )}

      {/* ── reconciliation ─────────────────────────────────────────────── */}
      {activeTab === "reconciliation" && (
        <section key="reconciliation" className="animate-fade-in-up rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#10141a]">Reconciliation</h2>
              <p className="mt-1 max-w-2xl text-sm text-[#4f4f4f]">
                Nightly comparison of our ledger against the supplier and the gateway. Balance
                drift and late deliveries are corrected automatically and shown here resolved;
                anything that could cost a user money is left open for a person.
              </p>
            </div>
            <Button
              variant="outline"
              disabled={running}
              onClick={async () => {
                setRunning(true)
                try {
                  const summary = await runReconciliation()
                  showNotice(
                    `Run complete. ${summary.balanceDrift} balance${summary.balanceDrift === 1 ? "" : "s"} rebuilt, ` +
                      `${summary.lateDeliveries} clawed back, ${summary.openItems} awaiting review.`,
                  )
                  // A clean run is worth a small moment. Nothing else in this console is.
                  if (summary.openItems === 0 && summary.errors.length === 0) celebrateCowries("small")
                  setMismatches(await listMismatches({ limit: 100 }))
                } catch (error) {
                  toast.error(getAuthErrorMessage(error))
                } finally {
                  setRunning(false)
                }
              }}
            >
              <RefreshCw className={cn("size-4", running && "animate-spin")} aria-hidden="true" />
              {running ? "Running…" : "Run now"}
            </Button>
          </div>

          {mismatches !== null && mismatches.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="flex gap-1 rounded-full bg-[#f4f6f8] p-1" role="tablist" aria-label="Finding state">
                {(
                  [
                    ["all", "All", allFindings.length],
                    ["open", "Open", allFindings.filter((m) => m.status !== "resolved").length],
                    ["resolved", "Resolved", allFindings.filter((m) => m.status === "resolved").length],
                  ] as const
                ).map(([key, label, count]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={findingFilter === key}
                    onClick={() => setFindingFilter(key)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                      findingFilter === key ? "bg-white text-[#10141a] shadow" : "text-[#4f4f4f] hover:bg-white/70",
                    )}
                  >
                    {label}
                    <span className="rounded-full bg-[#eef1f3] px-1.5 tabular-nums">{count}</span>
                  </button>
                ))}
              </div>
              <Select value={findingKind} onValueChange={(value) => setFindingKind(value as CowryMismatchKind | "all")}>
                <SelectTrigger className="h-9 w-56 rounded-full" aria-label="Finding kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Every kind</SelectItem>
                  {(Object.keys(MISMATCH_LABELS) as CowryMismatchKind[]).map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {MISMATCH_LABELS[kind]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {mismatches === null ? (
            <div className="mt-6 space-y-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : mismatches.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-gray-200 p-10 text-center">
              <CheckCircle2 className="animate-check-pop mx-auto size-10 text-emerald-500" aria-hidden="true" />
              <p className="mt-3 text-sm text-[#6b7280]">
                Nothing found. The ledger, the supplier and the gateway agree.
              </p>
            </div>
          ) : visibleFindings.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-[#6b7280]">
              No findings match these filters.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="admin-table w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-[#6b7280]">
                  <tr>
                    <th className="py-3 pr-4 font-semibold">Finding</th>
                    <th className="py-3 pr-4 font-semibold">Subject</th>
                    <th className="py-3 pr-4 font-semibold">Amount</th>
                    <th className="py-3 pr-4 font-semibold">Seen</th>
                    <th className="py-3 pr-4 font-semibold">State</th>
                    <th className="py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody className="cowry-stagger">
                  {visibleFindings.map((item: CowryMismatch) => {
                    const open = item.status !== "resolved"
                    const mine = item.assignedTo !== null && item.assignedTo === currentStaffUid
                    const busy = busyRow === item.id
                    const amount = findingAmount(item.detail)
                    return (
                      <tr key={item.id} className="border-b border-gray-100 last:border-0">
                        <td data-label="Finding" className="py-3 pr-4">
                          <span className="font-medium">{MISMATCH_LABELS[item.kind] ?? item.kind}</span>
                          {NEEDS_A_PERSON.has(item.kind) && open && (
                            <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                              needs review
                            </span>
                          )}
                        </td>
                        <td data-label="Subject" className="py-3 pr-4 font-mono text-xs text-[#4f4f4f]">
                          {item.subjectId ?? item.userId ?? "—"}
                        </td>
                        <td data-label="Amount" className="whitespace-nowrap py-3 pr-4 font-semibold tabular-nums text-[#10141a]">
                          {amount ?? <span className="font-normal text-[#9aa4b2]">—</span>}
                        </td>
                        <td data-label="Seen" className="py-3 pr-4 tabular-nums text-[#4f4f4f]">
                          {item.seenCount}
                          {item.seenCount > 1 && (
                            <span className="ml-1 text-xs text-amber-700">not resolving</span>
                          )}
                        </td>
                        <td data-label="State" className="py-3 pr-4">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-xs font-semibold",
                              item.status === "resolved"
                                ? "bg-emerald-50 text-emerald-700"
                                : item.status === "assigned"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-red-50 text-red-700",
                            )}
                          >
                            {item.status === "resolved" && item.resolution === "auto_corrected"
                              ? "Corrected automatically"
                              : item.status === "assigned" && mine
                                ? "assigned to you"
                                : item.status}
                          </span>
                        </td>
                        <td data-label="" className="py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setDetailItem(item)} aria-label="Details">
                              <Eye className="size-4" aria-hidden="true" />
                            </Button>
                            {open && !mine && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={busyRow !== null}
                                onClick={() =>
                                  mismatchAction(
                                    item.id,
                                    () => updateMismatch(item.id, { assignedTo: currentStaffUid }),
                                    "Assigned to you.",
                                  )
                                }
                              >
                                Take
                              </Button>
                            )}
                            {/* Two taps: resolving closes the item for everyone, and a
                                stray click should not be able to do that. */}
                            {open &&
                              (confirmResolve === item.id ? (
                                <Button
                                  size="sm"
                                  autoFocus
                                  className="animate-fadeIn bg-emerald-600"
                                  disabled={busy}
                                  onClick={() =>
                                    mismatchAction(
                                      item.id,
                                      () => updateMismatch(item.id, { resolution: "manual" }),
                                      "Marked resolved.",
                                    )
                                  }
                                  onBlur={() => !busy && setConfirmResolve(null)}
                                >
                                  {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                                  Confirm resolve
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={busyRow !== null}
                                  onClick={() => setConfirmResolve(item.id)}
                                >
                                  Resolve
                                </Button>
                              ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ── change log ─────────────────────────────────────────────────── */}
      {activeTab === "log" && (
        <section key="log" className="animate-fade-in-up rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#10141a]">Change log</h2>
              <p className="mt-1 max-w-2xl text-sm text-[#4f4f4f]">
                Every rate, budget and price change, newest first. Read-only — nothing in the system
                updates or deletes these rows. One row per field, so a single save that moved four
                ceilings reads as four decisions.
              </p>
            </div>
            <Button variant="outline" onClick={exportLog} disabled={filteredLog.length === 0}>
              <Download className="size-4" aria-hidden="true" />
              Export CSV
            </Button>
          </div>

          {changeLog !== null && changeLog.length > 0 && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select value={logSetting} onValueChange={setLogSetting}>
                <SelectTrigger aria-label="Setting">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Every setting</SelectItem>
                  {logSettings.map((key) => (
                    <SelectItem key={key} value={key}>
                      {key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={logPerson} onValueChange={setLogPerson}>
                <SelectTrigger aria-label="Changed by">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  {logPeople.map((person) => (
                    <SelectItem key={person} value={person}>
                      {person}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="date" aria-label="From" value={logFrom} onChange={(e) => setLogFrom(e.target.value)} />
              <Input type="date" aria-label="To" value={logTo} onChange={(e) => setLogTo(e.target.value)} />
            </div>
          )}

          {changeLog === null ? (
            <div className="mt-6 space-y-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : changeLog.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-[#6b7280]">
              No configuration changes recorded yet.
            </p>
          ) : filteredLog.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-[#6b7280]">
              No changes match these filters.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <p className="mb-2 text-xs text-[#8b95a1]">
                {filteredLog.length} of {changeLog.length} change{changeLog.length === 1 ? "" : "s"} (the latest 100)
              </p>
              <table className="admin-table w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-[#6b7280]">
                  <tr>
                    <th className="py-3 pr-4 font-semibold">When</th>
                    <th className="py-3 pr-4 font-semibold">Setting</th>
                    <th className="py-3 pr-4 font-semibold">Field</th>
                    <th className="py-3 pr-4 font-semibold">Change</th>
                    <th className="py-3 font-semibold">Changed by</th>
                  </tr>
                </thead>
                <tbody className="cowry-stagger">
                  {filteredLog.map((row: CowryConfigChange) => (
                    <tr key={row.id} className="border-b border-gray-100 last:border-0">
                      <td data-label="When" className="whitespace-nowrap py-3 pr-4 text-[#4f4f4f]">
                        {row.at ? formatRelative(row.at as Timestampish) : "—"}
                      </td>
                      <td data-label="Setting" className="py-3 pr-4 font-medium">{row.configKey}</td>
                      <td data-label="Field" className="py-3 pr-4 font-mono text-xs text-[#4f4f4f]">{row.field}</td>
                      <td data-label="Change" className="whitespace-nowrap py-3 pr-4 tabular-nums">
                        <span className="text-[#9aa4b2] line-through decoration-[#d0d5db]">
                          {logValue(row.oldValue)}
                        </span>
                        <span className="mx-2 text-[#9aa4b2]" aria-hidden="true">→</span>
                        <span className="sr-only"> to </span>
                        <span className="font-semibold text-[#10141a]">{logValue(row.newValue)}</span>
                      </td>
                      <td data-label="Changed by" className="py-3 text-[#4f4f4f]">
                        {row.staffName ?? row.staffUid ?? "—"}
                        {row.ipAddress && (
                          <span className="ml-2 font-mono text-xs text-[#9aa4b2]">{row.ipAddress}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ── the summary every money save passes through ─────────────────── */}
      <AlertDialog open={Boolean(pendingSave)} onOpenChange={(open) => !open && setPendingSave(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingSave?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              Live for every member as soon as you confirm, and recorded in the change log against you.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {pendingSave?.rows.map((row) => (
              <li
                key={row.label}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm",
                  row.warn ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-gray-50",
                )}
              >
                <p className="flex items-center justify-between gap-2 font-medium text-[#10141a]">
                  {row.label}
                  {row.warn && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-amber-800">
                      <AlertTriangle className="size-3.5" aria-hidden="true" />
                      {row.warn}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 tabular-nums">
                  <span className="text-[#9aa4b2] line-through">{row.from}</span>
                  <span className="mx-2 text-[#9aa4b2]" aria-hidden="true">→</span>
                  <span className="sr-only"> to </span>
                  <span className="font-semibold text-[#10141a]">{row.to}</span>
                </p>
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const run = pendingSave?.run
                setPendingSave(null)
                if (run) void run()
              }}
            >
              Confirm and save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── one reconciliation finding, in full ──────────────────────────── */}
      <Dialog open={Boolean(detailItem)} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detailItem ? MISMATCH_LABELS[detailItem.kind] ?? detailItem.kind : ""}</DialogTitle>
            <DialogDescription>Everything the sweep recorded about this finding.</DialogDescription>
          </DialogHeader>
          {detailItem && (
            <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              {(
                [
                  ["State", detailItem.status],
                  ["Resolution", detailItem.resolution ?? "—"],
                  ["Subject", detailItem.subjectId ?? "—"],
                  ["Member", detailItem.userId ?? "—"],
                  ["Assigned to", detailItem.assignedTo === currentStaffUid ? "You" : detailItem.assignedTo ?? "Nobody"],
                  ["Times seen", String(detailItem.seenCount)],
                  ["First seen", formatRelative(detailItem.firstSeenAt as Timestampish)],
                  ["Last seen", formatRelative(detailItem.lastSeenAt as Timestampish)],
                  ["Note", detailItem.resolutionNote ?? "—"],
                  ...Object.entries(detailItem.detail ?? {}).map(
                    ([key, value]) => [key, typeof value === "object" ? JSON.stringify(value) : String(value)] as const,
                  ),
                ] as const
              ).map(([key, value]) => (
                <div key={key} className="contents">
                  <dt className="text-[#6b7280]">{key}</dt>
                  <dd className="break-words font-mono text-xs leading-5 text-[#10141a]">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
