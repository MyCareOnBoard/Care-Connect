import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { cn } from "@/lib/utils"
import {
  deleteTaxonomy,
  listGiftTaxonomy,
  saveTaxonomy,
  type CowryTaxonomy,
  type CowryTaxonomyItem,
  type CowryTaxonomyKind,
} from "@/utils/careconnect/services/cowryAdminService"
import { suggestGiftId } from "@/utils/careconnect/services/cowryAdminService"

/**
 * Categories, rarities and collections, editable.
 *
 * This screen is the point of the Treasures work. The groupings used to be a five-value
 * enum in the backend with a second copy in the frontend, so "add a category" meant a code
 * change in two repositories and a deploy. Here it is a row.
 *
 * Three things are deliberate.
 *
 * A key cannot be edited after it is created. Every Treasure filed under a category stores
 * the key, so renaming it would orphan them — the label is what gets edited, and the label
 * is what every screen shows. The form says so rather than letting someone try.
 *
 * Deleting is refused by the server while Treasures are still filed under a row, and the
 * refusal says how many. Deactivating is offered first and is almost always what was
 * wanted: it empties the picker while leaving existing Treasures and every historical
 * record still able to render their label.
 *
 * Retired rows stay visible here. A screen that hid them could not turn one back on, and
 * the retired categories from before Treasures are what let old gift records still read.
 */

const KINDS: { kind: CowryTaxonomyKind; label: string; blurb: string }[] = [
  {
    kind: "category",
    label: "Categories",
    blurb: "What a Treasure is about. These become the tabs in the Treasure tray.",
  },
  {
    kind: "rarity",
    label: "Rarities",
    blurb:
      "How significant a Treasure is. Each carries a suggested price band and the size of animation it earns in a live stream.",
  },
  {
    kind: "collection",
    label: "Collections",
    blurb: "Named sets a member can complete. A collection may name the Treasure it unlocks.",
  },
]

type Draft = {
  kind: CowryTaxonomyKind
  key: string
  label: string
  description: string
  order: string
  active: boolean
  minCost: string
  maxCost: string
  liveTier: string
  rewardKey: string
  isNew: boolean
}

const emptyDraft = (kind: CowryTaxonomyKind, order: number): Draft => ({
  kind,
  key: "",
  label: "",
  description: "",
  order: String(order),
  active: true,
  minCost: "",
  maxCost: "",
  liveTier: "",
  rewardKey: "",
  isNew: true,
})

const str = (value: unknown): string =>
  value === undefined || value === null ? "" : String(value)

const draftFrom = (row: CowryTaxonomyItem): Draft => ({
  kind: row.kind,
  key: row.key,
  label: row.label,
  description: str(row.description),
  order: str(row.order),
  active: row.active !== false,
  minCost: str(row.minCost),
  maxCost: str(row.maxCost),
  liveTier: str(row.liveTier),
  rewardKey: str(row.rewardKey),
  isNew: false,
})

/** What is wrong with this draft, in the order an admin would hit it. Null when it is fine. */
export function taxonomyDraftProblem(draft: Draft): string | null {
  if (!draft.label.trim()) return "Give it a name."
  if (!draft.key.trim()) return "Give it a key."
  if (!/^[a-z0-9][a-z0-9_]*$/.test(draft.key)) {
    return "A key must be lowercase letters, numbers and underscores."
  }

  // Emptiness before Number(), because Number("") is 0 — an untouched band would otherwise
  // read as a floor of zero and silently claim every cheap Treasure.
  const band = (value: string) => (value.trim() ? Number(value) : null)
  const min = band(draft.minCost)
  const max = band(draft.maxCost)
  if (min !== null && (!Number.isInteger(min) || min < 0)) return "A price floor must be a whole number."
  if (max !== null && (!Number.isInteger(max) || max < 0)) return "A price ceiling must be a whole number."
  if (min !== null && max !== null && min > max) {
    return "The bottom of the band must not be above the top."
  }

  if (draft.liveTier.trim()) {
    const tier = Number(draft.liveTier)
    if (!Number.isInteger(tier) || tier < 1 || tier > 5) {
      return "A live-stream tier is a whole number from 1 to 5."
    }
  }

  if (draft.order.trim()) {
    const order = Number(draft.order)
    if (!Number.isInteger(order) || order < 0) return "An order must be a whole number."
  }

  return null
}

const toInput = (draft: Draft) => {
  const num = (value: string) => (value.trim() ? Number(value) : null)
  const base = {
    label: draft.label.trim(),
    description: draft.description.trim() || null,
    order: draft.order.trim() ? Number(draft.order) : 100,
    active: draft.active,
  }
  if (draft.kind === "rarity") {
    return { ...base, minCost: num(draft.minCost), maxCost: num(draft.maxCost), liveTier: num(draft.liveTier) }
  }
  if (draft.kind === "collection") {
    return { ...base, rewardKey: draft.rewardKey.trim() || null }
  }
  return base
}

/** The band a rarity covers, in words, for the row. */
function bandLabel(row: CowryTaxonomyItem): string | null {
  if (!Number.isFinite(row.minCost as number)) return null
  return row.maxCost == null ? `${row.minCost}+ Cowries` : `${row.minCost}–${row.maxCost} Cowries`
}

export function TaxonomyManager() {
  const [taxonomy, setTaxonomy] = useState<CowryTaxonomy | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [activeKind, setActiveKind] = useState<CowryTaxonomyKind>("category")
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<CowryTaxonomyItem | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      setTaxonomy(await listGiftTaxonomy())
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(() => {
    if (!taxonomy) return []
    if (activeKind === "category") return taxonomy.categories
    if (activeKind === "rarity") return taxonomy.rarities
    return taxonomy.collections
  }, [taxonomy, activeKind])

  const problem = draft ? taxonomyDraftProblem(draft) : null

  async function commit() {
    if (!draft || problem) return
    setSaving(true)
    try {
      await saveTaxonomy(draft.kind, draft.key, toInput(draft))
      toast.success(draft.isNew ? `${draft.label} added.` : `${draft.label} saved.`)
      setDraft(null)
      await load()
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!pendingDelete) return
    setSaving(true)
    try {
      await deleteTaxonomy(pendingDelete.kind, pendingDelete.key)
      toast.success(`${pendingDelete.label} removed.`)
      setPendingDelete(null)
      await load()
    } catch (error) {
      // The server refuses while Treasures still use it and says how many. That message is
      // the useful one — it tells the admin what to do next — so it is shown as-is.
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const kind = KINDS.find((k) => k.kind === activeKind)!
  const nextOrder = (rows.at(-1)?.order ?? 0) + 1

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#10141a]">Treasure groupings</h2>
          <p className="mt-1 text-sm text-[#4f4f4f]">
            Categories, rarities and collections. Adding one here is all that is needed — no release.
          </p>
        </div>
        <Button onClick={() => setDraft(emptyDraft(activeKind, nextOrder))} disabled={loading || saving}>
          <Plus className="mr-2 size-4" aria-hidden="true" />
          Add a {activeKind}
        </Button>
      </div>

      <div
        role="tablist"
        aria-label="Treasure groupings"
        className="scrollbar-hide mt-5 flex gap-1.5 overflow-x-auto rounded-full bg-[#f4f6f8] p-1"
      >
        {KINDS.map((entry) => {
          const active = activeKind === entry.kind
          return (
            <button
              key={entry.kind}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveKind(entry.kind)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all duration-200",
                active ? "bg-white text-[#10141a] shadow" : "text-[#4f4f4f] hover:bg-white/70",
              )}
            >
              {entry.label}
              <span className="text-xs font-bold tabular-nums text-[#8b95a1]">
                {taxonomy
                  ? entry.kind === "category"
                    ? taxonomy.categories.length
                    : entry.kind === "rarity"
                      ? taxonomy.rarities.length
                      : taxonomy.collections.length
                  : 0}
              </span>
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-sm text-[#8b95a1]">{kind.blurb}</p>

      {failed ? (
        <div className="mt-4 rounded-lg border border-dashed border-[#d7dde3] p-8 text-center">
          <p className="text-sm font-semibold text-[#4f5862]">The groupings could not be loaded</p>
          <Button variant="outline" className="mt-3" onClick={() => void load()}>
            <RefreshCw className="mr-2 size-4" aria-hidden="true" />
            Try again
          </Button>
        </div>
      ) : loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-[#d7dde3] p-8 text-center">
          <p className="text-sm font-semibold text-[#4f5862]">Nothing here yet</p>
          <p className="mt-1 text-sm text-[#8b95a1]">
            Treasures cannot be filed until at least one {activeKind} exists.
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-[#eef1f3] overflow-hidden rounded-lg ring-1 ring-[#e2e6ea]">
          {rows.map((row) => {
            const inactive = row.active === false
            const band = bandLabel(row)
            return (
              <li
                key={row.key}
                className={cn(
                  "flex items-center gap-3 p-3 transition-colors hover:bg-[#f9fafb]",
                  inactive && "opacity-60",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#141922]">
                    {row.label}
                    {inactive && (
                      <span className="rounded-full bg-[#eef1f3] px-2 py-0.5 text-[11px] font-semibold text-[#657080]">
                        Hidden from pickers
                      </span>
                    )}
                    {band && (
                      <span className="rounded-full bg-[#e0f2ff] px-2 py-0.5 text-[11px] font-semibold text-[#0d8de0]">
                        {band}
                      </span>
                    )}
                    {row.liveTier != null && (
                      <span className="rounded-full bg-[#f1e8ff] px-2 py-0.5 text-[11px] font-semibold text-[#7a4fd1]">
                        Live tier {row.liveTier}
                      </span>
                    )}
                    {row.rewardKey && (
                      <span className="rounded-full bg-[#fff4df] px-2 py-0.5 text-[11px] font-semibold text-[#a8793f]">
                        Unlocks {row.rewardKey}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-[#8b95a1]">
                    {row.key}
                    {row.description ? ` · ${row.description}` : ""}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${row.label}`}
                  disabled={saving}
                  onClick={() => setDraft(draftFrom(row))}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${row.label}`}
                  disabled={saving}
                  onClick={() => setPendingDelete(row)}
                >
                  <Trash2 className="size-4 text-[#c2453d]" aria-hidden="true" />
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      {/* ── add / edit ─────────────────────────────────────────────────────── */}

      <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent showCloseButton className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {draft?.isNew ? `Add a ${draft.kind}` : `Edit ${draft?.label}`}
            </DialogTitle>
            <DialogDescription>
              {draft?.isNew
                ? "It becomes available in the Treasure editor straight away."
                : "The key cannot change — every Treasure filed under it stores the key."}
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-4">
              <div>
                <label htmlFor="tax-label" className="text-sm font-medium text-[#10141a]">
                  Name
                </label>
                <Input
                  id="tax-label"
                  className="mt-1.5"
                  value={draft.label}
                  onChange={(e) =>
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            label: e.target.value,
                            // Only while new. After that the key is the identity.
                            key: d.isNew ? suggestGiftId(e.target.value) : d.key,
                          }
                        : d,
                    )
                  }
                />
              </div>

              <div>
                <label htmlFor="tax-key" className="text-sm font-medium text-[#10141a]">
                  Key
                </label>
                <Input
                  id="tax-key"
                  className="mt-1.5 font-mono text-sm"
                  value={draft.key}
                  disabled={!draft.isNew}
                  onChange={(e) => setDraft((d) => (d ? { ...d, key: e.target.value } : d))}
                />
                <p className="mt-1.5 text-xs text-[#8b95a1]">
                  {draft.isNew
                    ? "Lowercase letters, numbers and underscores. It cannot be changed later."
                    : "Fixed. Every Treasure filed here stores this key — rename the name instead."}
                </p>
              </div>

              <div>
                <label htmlFor="tax-description" className="text-sm font-medium text-[#10141a]">
                  Description <span className="font-normal text-[#8b95a1]">(optional)</span>
                </label>
                <Input
                  id="tax-description"
                  className="mt-1.5"
                  value={draft.description}
                  onChange={(e) => setDraft((d) => (d ? { ...d, description: e.target.value } : d))}
                />
              </div>

              {draft.kind === "rarity" && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="tax-min" className="text-sm font-medium text-[#10141a]">
                      From
                    </label>
                    <Input
                      id="tax-min"
                      type="number"
                      min={0}
                      className="mt-1.5"
                      value={draft.minCost}
                      onChange={(e) => setDraft((d) => (d ? { ...d, minCost: e.target.value } : d))}
                    />
                  </div>
                  <div>
                    <label htmlFor="tax-max" className="text-sm font-medium text-[#10141a]">
                      To
                    </label>
                    <Input
                      id="tax-max"
                      type="number"
                      min={0}
                      className="mt-1.5"
                      placeholder="Open-ended"
                      value={draft.maxCost}
                      onChange={(e) => setDraft((d) => (d ? { ...d, maxCost: e.target.value } : d))}
                    />
                  </div>
                  <div>
                    <label htmlFor="tax-tier" className="text-sm font-medium text-[#10141a]">
                      Live tier
                    </label>
                    <Input
                      id="tax-tier"
                      type="number"
                      min={1}
                      max={5}
                      className="mt-1.5"
                      value={draft.liveTier}
                      onChange={(e) => setDraft((d) => (d ? { ...d, liveTier: e.target.value } : d))}
                    />
                  </div>
                </div>
              )}

              {draft.kind === "collection" && (
                <div>
                  <label htmlFor="tax-reward" className="text-sm font-medium text-[#10141a]">
                    Unlocks <span className="font-normal text-[#8b95a1]">(optional)</span>
                  </label>
                  <Input
                    id="tax-reward"
                    className="mt-1.5 font-mono text-sm"
                    placeholder="healing_horizon"
                    value={draft.rewardKey}
                    onChange={(e) => setDraft((d) => (d ? { ...d, rewardKey: e.target.value } : d))}
                  />
                  <p className="mt-1.5 text-xs text-[#8b95a1]">
                    The id of the Treasure a member gets for completing this collection.
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="tax-order" className="text-sm font-medium text-[#10141a]">
                    Order
                  </label>
                  <Input
                    id="tax-order"
                    type="number"
                    min={0}
                    className="mt-1.5"
                    value={draft.order}
                    onChange={(e) => setDraft((d) => (d ? { ...d, order: e.target.value } : d))}
                  />
                  <p className="mt-1.5 text-xs text-[#8b95a1]">Lower comes first.</p>
                </div>

                <div className="flex items-start justify-between gap-3 rounded-lg border border-[#e2e6ea] p-3">
                  <div>
                    <p className="text-sm font-semibold text-[#10141a]">Available</p>
                    <p className="mt-1 text-xs text-[#8b95a1]">
                      Off hides it from the pickers. Treasures already filed here keep working.
                    </p>
                  </div>
                  <Switch
                    checked={draft.active}
                    onCheckedChange={(checked) => setDraft((d) => (d ? { ...d, active: checked } : d))}
                  />
                </div>
              </div>

              {problem && (
                <p className="rounded-lg bg-[#fff1f0] px-3 py-2 text-sm text-[#c2453d]">{problem}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void commit()} disabled={Boolean(problem) || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── remove ─────────────────────────────────────────────────────────── */}

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {pendingDelete?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. If any Treasure is still filed here the removal is refused —
              turning it off instead hides it from the pickers while keeping every existing Treasure
              and past record readable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()} disabled={saving}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
