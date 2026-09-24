import { useCallback, useEffect, useState } from "react"
import { AlertCircle, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getAuthErrorMessage, useAuthUser } from "@/utils/auth"
import {
  getAdminConfig,
  listChangeLog,
  listMismatches,
  runReconciliation,
  savePackage,
  updateMismatch,
  updatePools,
  updatePricing,
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
 * Every field here is money. The screen is deliberately plain — a form that reads like a
 * spreadsheet, showing the current value and what it would become, rather than anything
 * that hides the arithmetic.
 */

type TabKey = "pools" | "rewards" | "pricing" | "packages" | "reconciliation" | "log"

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "pools", label: "Budget pools" },
  { key: "rewards", label: "Reward rates" },
  { key: "pricing", label: "Pricing & fees" },
  { key: "packages", label: "Data packages" },
  { key: "reconciliation", label: "Reconciliation" },
  { key: "log", label: "Change log" },
]

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

/** Renders a log value, including the null that means "was never set". */
function logValue(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "number") return value.toLocaleString("en-US")
  return String(value)
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm text-[#4f4f4f]">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-[#10141a]">{value}</p>
      {hint && <p className="mt-1 text-xs text-[#6b7280]">{hint}</p>}
    </div>
  )
}

export default function AdminCowryPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("pools")

  const [config, setConfig] = useState<CowryAdminConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const [mismatches, setMismatches] = useState<CowryMismatch[]>([])
  const [changeLog, setChangeLog] = useState<CowryConfigChange[]>([])
  const [running, setRunning] = useState(false)
  const [saving, setSaving] = useState(false)

  // "Take" assigns to whoever is looking at the queue, so an item cannot be claimed
  // on someone else's behalf by accident.
  const { user } = useAuthUser()
  const currentStaffUid = user?.uid ?? null

  // Drafts, so a form shows what the operator typed rather than snapping back on refetch.
  const [poolDraft, setPoolDraft] = useState<Record<string, string>>({})
  const [rewardDraft, setRewardDraft] = useState<Record<string, string>>({})
  const [capDraft, setCapDraft] = useState<Record<string, string>>({})
  const [pricingDraft, setPricingDraft] = useState<Record<string, string>>({})
  const [packageDraft, setPackageDraft] = useState<Record<string, Record<string, string>>>({})
  const [notice, setNotice] = useState<string | null>(null)

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

  // Seed the drafts whenever the server view changes, so an edit starts from what is live.
  useEffect(() => {
    if (!config) return
    setPoolDraft(
      Object.fromEntries(Object.entries(config.pools).map(([k, v]) => [k, String(v ?? 0)])),
    )
    setRewardDraft(
      Object.fromEntries(
        Object.entries(config.rewards.baseValues).map(([k, v]) => [k, String(v ?? 0)]),
      ),
    )
    setCapDraft(
      Object.fromEntries(
        Object.entries(config.rewards.dailyCaps).map(([k, v]) => [k, v === null ? "" : String(v)]),
      ),
    )
    setPricingDraft({
      cowryNairaValue:
        config.pricing.cowryNairaValue === null ? "" : String(config.pricing.cowryNairaValue),
      depositFeeRate: String(config.pricing.depositFeeRate),
      withdrawalFeeRate: String(config.pricing.withdrawalFeeRate),
    })
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
      setNotice(
        result.changed
          ? `Saved. ${result.changes.length} value${result.changes.length === 1 ? "" : "s"} changed and recorded in the log.`
          : "Nothing changed, so nothing was recorded.",
      )
      await loadConfig()
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-20 text-[#4f4f4f]">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        Loading Cowry settings…
      </div>
    )
  }

  if (failed || !config) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">Couldn&apos;t load the Cowry settings.</p>
          <p className="mt-1">
            These endpoints require super admin with MFA satisfied. Refresh, or re-authenticate
            if your session has aged out.
          </p>
        </div>
      </div>
    )
  }

  const impliedCost = config.impliedNairaPerCowry

  return (
    <div className="pb-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold leading-tight text-[#10141a] sm:text-[36px]">
          Cowry economy
        </h1>
        <p className="text-[#4f4f4f]">
          Budgets, reward rates, pricing and the data catalogue. Every change is recorded
          against you, with its old and new value.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Cowry value"
          value={
            config.pricing.cowryNairaValue === null
              ? "Not set"
              : `₦${config.pricing.cowryNairaValue}`
          }
          hint={config.pricing.cowryNairaValue === null ? "Finance has not set this yet" : undefined}
        />
        <Stat
          label="Implied cost per Cowry"
          value={impliedCost === null ? "—" : `₦${impliedCost.toFixed(4)}`}
          hint="Derived from supplier prices, not configured"
        />
        <Stat
          label="Issued today"
          value={number(config.poolUsage.reduce((sum, pool) => sum + pool.issued, 0))}
          hint="Across every budget pool"
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActiveTab(tab.key)
              setNotice(null)
            }}
            className={`rounded-full px-5 py-2 font-medium shadow-sm transition ${
              activeTab === tab.key
                ? "bg-[#00b3ad] text-white"
                : "border border-gray-200 bg-white text-[#4f4f4f] hover:border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {notice && (
        <div className="mb-5 rounded-lg border border-[#b8e6e4] bg-[#eefbfa] px-4 py-3 text-sm text-[#0f5f5c]">
          {notice}
        </div>
      )}

      {/* ── pools ──────────────────────────────────────────────────────── */}
      {activeTab === "pools" && (
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-[#10141a]">Daily issuing ceilings</h2>
          <p className="mt-1 text-sm text-[#4f4f4f]">
            When a pool reaches its ceiling it stops paying for the day and tells the user
            plainly. It never quietly pays less.
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-[#6b7280]">
                <tr>
                  <th className="py-3 pr-4 font-semibold">Pool</th>
                  <th className="py-3 pr-4 font-semibold">Issued today</th>
                  <th className="py-3 pr-4 font-semibold">Daily ceiling</th>
                  <th className="py-3 font-semibold">State</th>
                </tr>
              </thead>
              <tbody>
                {config.poolUsage.map((pool) => (
                  <tr key={pool.poolType} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 pr-4 font-medium">{POOL_LABELS[pool.poolType]}</td>
                    <td className="py-3 pr-4 tabular-nums text-[#4f4f4f]">{number(pool.issued)}</td>
                    <td className="py-3 pr-4">
                      <Input
                        type="number"
                        min={0}
                        className="w-40"
                        aria-label={`${POOL_LABELS[pool.poolType]} daily ceiling`}
                        value={poolDraft[pool.poolType] ?? ""}
                        onChange={(e) =>
                          setPoolDraft((d) => ({ ...d, [pool.poolType]: e.target.value }))
                        }
                      />
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          pool.exhausted
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {pool.exhausted ? "Exhausted" : `${number(pool.remaining)} left`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button
            className="mt-5"
            disabled={saving}
            onClick={() =>
              save(() =>
                updatePools(
                  Object.fromEntries(
                    Object.entries(poolDraft)
                      .filter(([, v]) => v !== "")
                      .map(([k, v]) => [k, Number(v)]),
                  ),
                ),
              )
            }
          >
            <Save className="mr-2 size-4" aria-hidden="true" />
            Save ceilings
          </Button>
        </section>
      )}

      {/* ── rewards ────────────────────────────────────────────────────── */}
      {activeTab === "rewards" && (
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-[#10141a]">What each activity pays</h2>
          <p className="mt-1 text-sm text-[#4f4f4f]">
            Base value before multipliers, and how many times a day it pays. Leave a cap blank
            for no daily limit.
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-[#6b7280]">
                <tr>
                  <th className="py-3 pr-4 font-semibold">Activity</th>
                  <th className="py-3 pr-4 font-semibold">Cowries</th>
                  <th className="py-3 font-semibold">Daily cap</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(ACTIVITY_LABELS) as CowryActivityType[]).map((activity) => (
                  <tr key={activity} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 pr-4 font-medium">{ACTIVITY_LABELS[activity]}</td>
                    <td className="py-3 pr-4">
                      <Input
                        type="number"
                        min={0}
                        className="w-32"
                        aria-label={`${ACTIVITY_LABELS[activity]} base value`}
                        value={rewardDraft[activity] ?? ""}
                        onChange={(e) =>
                          setRewardDraft((d) => ({ ...d, [activity]: e.target.value }))
                        }
                      />
                    </td>
                    <td className="py-3">
                      <Input
                        type="number"
                        min={0}
                        placeholder="No cap"
                        className="w-32"
                        aria-label={`${ACTIVITY_LABELS[activity]} daily cap`}
                        value={capDraft[activity] ?? ""}
                        onChange={(e) => setCapDraft((d) => ({ ...d, [activity]: e.target.value }))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Multiplier ceilings</p>
            <p className="mt-1">
              Quality {config.rewards.multiplierCeilings.quality}, trust{" "}
              {config.rewards.multiplierCeilings.trust}, campaign{" "}
              {config.rewards.multiplierCeilings.campaign}. These may be tightened but never
              raised past the engine&apos;s own limits — a higher value is rejected rather than
              silently clamped, so the mistake surfaces here rather than in a payout.
            </p>
          </div>

          <Button
            className="mt-5"
            disabled={saving}
            onClick={() =>
              save(() =>
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
              )
            }
          >
            <Save className="mr-2 size-4" aria-hidden="true" />
            Save rates
          </Button>
        </section>
      )}

      {/* ── pricing ────────────────────────────────────────────────────── */}
      {activeTab === "pricing" && (
        <section className="max-w-xl rounded-xl border border-gray-200 bg-white p-6">
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
              <Input
                id="cowry-value"
                type="number"
                step="0.01"
                min={0}
                placeholder="Not set"
                className="mt-1.5"
                value={pricingDraft.cowryNairaValue ?? ""}
                onChange={(e) =>
                  setPricingDraft((d) => ({ ...d, cowryNairaValue: e.target.value }))
                }
              />
              <p className="mt-1 text-xs text-[#6b7280]">
                Leave blank until finance sets it. A placeholder number here would look
                authoritative everywhere it is shown.
              </p>
            </div>

            <div>
              <label htmlFor="deposit-fee" className="text-sm font-medium text-[#10141a]">
                Deposit fee (buying Cowries)
              </label>
              <Input
                id="deposit-fee"
                type="number"
                step="0.01"
                min={0}
                max={0.5}
                className="mt-1.5"
                value={pricingDraft.depositFeeRate ?? ""}
                onChange={(e) => setPricingDraft((d) => ({ ...d, depositFeeRate: e.target.value }))}
              />
            </div>

            <div>
              <label htmlFor="withdrawal-fee" className="text-sm font-medium text-[#10141a]">
                Withdrawal fee (cash out, and data from purchased Cowries)
              </label>
              <Input
                id="withdrawal-fee"
                type="number"
                step="0.01"
                min={0}
                max={0.5}
                className="mt-1.5"
                value={pricingDraft.withdrawalFeeRate ?? ""}
                onChange={(e) =>
                  setPricingDraft((d) => ({ ...d, withdrawalFeeRate: e.target.value }))
                }
              />
            </div>

            {/* The round trip, shown because a user who discovers it at withdrawal reads
                it as a trick. Worth an operator seeing the same number. */}
            <div className="rounded-lg bg-gray-50 p-4 text-sm text-[#4f4f4f]">
              <p className="font-semibold text-[#10141a]">Round trip at these rates</p>
              <p className="mt-1 tabular-nums">
                ₦1,000 in → ₦
                {(1000 * (1 - Number(pricingDraft.depositFeeRate || 0))).toFixed(2)} of Cowries → ₦
                {(
                  1000 *
                  (1 - Number(pricingDraft.depositFeeRate || 0)) *
                  (1 - Number(pricingDraft.withdrawalFeeRate || 0))
                ).toFixed(2)}{" "}
                back out
              </p>
            </div>
          </div>

          <Button
            className="mt-5"
            disabled={saving}
            onClick={() =>
              save(() =>
                updatePricing({
                  cowryNairaValue:
                    pricingDraft.cowryNairaValue === ""
                      ? null
                      : Number(pricingDraft.cowryNairaValue),
                  depositFeeRate: Number(pricingDraft.depositFeeRate),
                  withdrawalFeeRate: Number(pricingDraft.withdrawalFeeRate),
                }),
              )
            }
          >
            <Save className="mr-2 size-4" aria-hidden="true" />
            Save pricing
          </Button>
        </section>
      )}

      {/* ── packages ───────────────────────────────────────────────────── */}
      {activeTab === "packages" && (
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-[#10141a]">Data packages</h2>
          <p className="mt-1 text-sm text-[#4f4f4f]">
            Changing a price changes what every user pays on their next redemption. Supplier
            cost feeds the implied cost per Cowry shown above.
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-[#6b7280]">
                <tr>
                  <th className="py-3 pr-4 font-semibold">Package</th>
                  <th className="py-3 pr-4 font-semibold">Cowry cost</th>
                  <th className="py-3 pr-4 font-semibold">Supplier cost (₦)</th>
                  <th className="py-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {config.packages.map((pkg: CowryDataPackage) => {
                  const draft = packageDraft[pkg.id] ?? {}
                  return (
                    <tr key={pkg.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 pr-4 font-medium">
                        {pkg.label}
                        <span className="ml-2 font-mono text-xs text-[#6b7280]">{pkg.id}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <Input
                          type="number"
                          min={1}
                          className="w-32"
                          aria-label={`${pkg.label} Cowry cost`}
                          value={draft.cowryCost ?? String(pkg.cowryCost)}
                          onChange={(e) =>
                            setPackageDraft((d) => ({
                              ...d,
                              [pkg.id]: { ...d[pkg.id], cowryCost: e.target.value },
                            }))
                          }
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          placeholder="Unknown"
                          className="w-32"
                          aria-label={`${pkg.label} supplier cost`}
                          value={draft.supplierNairaCost ?? String(pkg.supplierNairaCost ?? "")}
                          onChange={(e) =>
                            setPackageDraft((d) => ({
                              ...d,
                              [pkg.id]: { ...d[pkg.id], supplierNairaCost: e.target.value },
                            }))
                          }
                        />
                      </td>
                      <td className="py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={saving}
                          onClick={async () => {
                            setSaving(true)
                            try {
                              await savePackage(pkg.id, {
                                label: pkg.label,
                                megabytes: pkg.megabytes,
                                cowryCost: Number(draft.cowryCost ?? pkg.cowryCost),
                                supplierNairaCost:
                                  (draft.supplierNairaCost ?? pkg.supplierNairaCost ?? "") === ""
                                    ? null
                                    : Number(draft.supplierNairaCost ?? pkg.supplierNairaCost),
                                active: pkg.active !== false,
                              })
                              setNotice(`${pkg.label} saved and recorded in the log.`)
                              await loadConfig()
                            } catch (error) {
                              toast.error(getAuthErrorMessage(error))
                            } finally {
                              setSaving(false)
                            }
                          }}
                        >
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

      {/* ── reconciliation ─────────────────────────────────────────────── */}
      {activeTab === "reconciliation" && (
        <section className="rounded-xl border border-gray-200 bg-white p-6">
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
                  setNotice(
                    `Run complete. ${summary.balanceDrift} balance${summary.balanceDrift === 1 ? "" : "s"} rebuilt, ` +
                      `${summary.lateDeliveries} clawed back, ${summary.openItems} awaiting review.`,
                  )
                  setMismatches(await listMismatches({ limit: 100 }))
                } catch (error) {
                  toast.error(getAuthErrorMessage(error))
                } finally {
                  setRunning(false)
                }
              }}
            >
              {running ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                  Running…
                </>
              ) : (
                "Run now"
              )}
            </Button>
          </div>

          {mismatches.length === 0 ? (
            <p className="mt-6 rounded-lg border border-dashed border-gray-200 p-10 text-center text-sm text-[#6b7280]">
              Nothing found. The ledger, the supplier and the gateway agree.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-[#6b7280]">
                  <tr>
                    <th className="py-3 pr-4 font-semibold">Finding</th>
                    <th className="py-3 pr-4 font-semibold">Subject</th>
                    <th className="py-3 pr-4 font-semibold">Seen</th>
                    <th className="py-3 pr-4 font-semibold">State</th>
                    <th className="py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {mismatches.map((item: CowryMismatch) => {
                    const open = item.status !== "resolved"
                    return (
                      <tr key={item.id} className="border-b border-gray-100 last:border-0">
                        <td className="py-3 pr-4">
                          <span className="font-medium">
                            {MISMATCH_LABELS[item.kind] ?? item.kind}
                          </span>
                          {NEEDS_A_PERSON.has(item.kind) && open && (
                            <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                              needs review
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs text-[#4f4f4f]">
                          {item.subjectId ?? item.userId ?? "—"}
                        </td>
                        <td className="py-3 pr-4 tabular-nums text-[#4f4f4f]">
                          {item.seenCount}
                          {item.seenCount > 1 && (
                            <span className="ml-1 text-xs text-amber-700">not resolving</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              item.status === "resolved"
                                ? "bg-emerald-50 text-emerald-700"
                                : item.status === "assigned"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-red-50 text-red-700"
                            }`}
                          >
                            {item.status === "resolved" && item.resolution === "auto_corrected"
                              ? "Corrected automatically"
                              : item.status}
                          </span>
                        </td>
                        <td className="py-3">
                          {open && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await updateMismatch(item.id, { assignedTo: currentStaffUid })
                                    setNotice("Assigned to you.")
                                    setMismatches(await listMismatches({ limit: 100 }))
                                  } catch (error) {
                                    toast.error(getAuthErrorMessage(error))
                                  }
                                }}
                              >
                                Take
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await updateMismatch(item.id, { resolution: "manual" })
                                    setNotice("Marked resolved.")
                                    setMismatches(await listMismatches({ limit: 100 }))
                                  } catch (error) {
                                    toast.error(getAuthErrorMessage(error))
                                  }
                                }}
                              >
                                Resolve
                              </Button>
                            </div>
                          )}
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
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-[#10141a]">Change log</h2>
          <p className="mt-1 text-sm text-[#4f4f4f]">
            Every rate, budget and price change, newest first. Read-only — nothing in the system
            updates or deletes these rows. One row per field, so a single save that moved four
            ceilings reads as four decisions.
          </p>

          {changeLog.length === 0 ? (
            <p className="mt-6 rounded-lg border border-dashed border-gray-200 p-10 text-center text-sm text-[#6b7280]">
              No configuration changes recorded yet.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-[#6b7280]">
                  <tr>
                    <th className="py-3 pr-4 font-semibold">Setting</th>
                    <th className="py-3 pr-4 font-semibold">Field</th>
                    <th className="py-3 pr-4 font-semibold">From</th>
                    <th className="py-3 pr-4 font-semibold">To</th>
                    <th className="py-3 font-semibold">Changed by</th>
                  </tr>
                </thead>
                <tbody>
                  {changeLog.map((row: CowryConfigChange) => (
                    <tr key={row.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 pr-4 font-medium">{row.configKey}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-[#4f4f4f]">{row.field}</td>
                      <td className="py-3 pr-4 tabular-nums text-[#4f4f4f]">
                        {logValue(row.oldValue)}
                      </td>
                      <td className="py-3 pr-4 font-semibold tabular-nums">
                        {logValue(row.newValue)}
                      </td>
                      <td className="py-3 text-[#4f4f4f]">
                        {row.staffName ?? row.staffUid ?? "—"}
                        {row.ipAddress && (
                          <span className="ml-2 font-mono text-xs text-[#9aa4b2]">
                            {row.ipAddress}
                          </span>
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
    </div>
  )
}
