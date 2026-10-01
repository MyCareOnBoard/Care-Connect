import { useCallback, useEffect, useState } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GiftIcon } from "@/components/cowry/GiftIcon"
import { CowryIcon } from "@/components/cowry/CowryIcon"
import { GIFT_SET_LABELS, formatCowries } from "@/utils/careconnect/cowry"
import { getAuthErrorMessage } from "@/utils/auth"
import { cn } from "@/lib/utils"
import {
  deleteGift,
  listAdminGifts,
  saveGift,
  type CowryAdminGift,
  type CowryAdminGiftCatalog,
  type CowryGiftSetId,
} from "@/utils/careconnect/services/cowryAdminService"
import {
  emptyGiftDraft,
  giftDraftFrom,
  giftDraftProblem,
  giftDraftToInput,
  nextDraftForLabel,
  type GiftDraft,
} from "@/utils/careconnect/giftDraft"

/**
 * The gift catalogue, editable.
 *
 * Two things here are not obvious from the CRUD.
 *
 * The first save turns the fifty built-in gifts into real rows. Until an admin changes
 * something, the catalogue is a fallback the backend returns for an empty collection, and
 * saving one gift without seeding first would have left members with that gift and no
 * other. The backend handles it; this screen says so, before and after, because an admin
 * who edits one price and finds they have created fifty rows deserves to have been told.
 *
 * And a gift's id is what its icon is matched against. "Rose Bouquet" finds the rose because
 * the id is `rose_bouquet`; call it `gift_7` and it gets a generic coin. So the id is shown
 * rather than derived silently, and for anything word matching cannot recognise there is an
 * icon override.
 */

const SETS: CowryGiftSetId[] = ["everyday", "warm", "bold", "rare", "legendary"]

/** Gift sets get their own tint, so a legendary gift looks like one. */
const SET_TINTS: Record<string, string> = {
  everyday: "bg-[#eef1f3] text-[#565656]",
  warm: "bg-[#fff4df] text-[#a8793f]",
  bold: "bg-[#e0f2ff] text-[#0d8de0]",
  rare: "bg-[#f1e8ff] text-[#7a4fd1]",
  legendary: "bg-[linear-gradient(135deg,#fff1c7,#f3c969)] text-[#7a5310]",
}

function GiftRow({
  gift,
  onEdit,
  onDelete,
  busy,
}: {
  gift: CowryAdminGift
  onEdit: () => void
  onDelete: () => void
  busy: boolean
}) {
  const inactive = gift.active === false
  return (
    <li
      className={cn(
        "flex items-center gap-3 p-3 transition-colors hover:bg-[#f9fafb]",
        inactive && "opacity-60",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-2xl",
          SET_TINTS[gift.set] ?? SET_TINTS.everyday,
        )}
      >
        <GiftIcon gift={{ id: gift.id, label: gift.label, icon: gift.icon }} size={20} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#141922]">
          {gift.label}
          {inactive && (
            <span className="rounded-full bg-[#eef1f3] px-2 py-0.5 text-[11px] font-semibold text-[#657080]">
              Not sendable
            </span>
          )}
        </p>
        <p className="truncate text-xs text-[#8b95a1]">
          {gift.id}
          {gift.creatorRate !== undefined && gift.creatorRate !== null && (
            <> · creator gets {Math.round(gift.creatorRate * 100)}%</>
          )}
        </p>
      </div>

      <p className="flex shrink-0 items-center gap-1 text-sm font-bold tabular-nums text-[#141922]">
        <CowryIcon size={14} />
        {formatCowries(gift.cost)}
      </p>

      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit} disabled={busy} aria-label={`Edit ${gift.label}`}>
          <Pencil className="size-4" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={busy}
          aria-label={`Remove ${gift.label}`}
          className="text-[#b4232a] hover:bg-[#fdeaea] hover:text-[#8f1b21]"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </li>
  )
}

export function GiftCatalogManager() {
  const [catalog, setCatalog] = useState<CowryAdminGiftCatalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [draft, setDraft] = useState<GiftDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<CowryAdminGift | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      setCatalog(await listAdminGifts())
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const problem = draft ? giftDraftProblem(draft) : null

  async function commit() {
    if (!draft || problem) return
    setSaving(true)
    try {
      const { seededCatalogue } = await saveGift(draft.id, giftDraftToInput(draft))

      // Said once, loudly: the first edit turned a fallback list into fifty real rows.
      if (seededCatalogue) {
        toast.success(
          `Saved. The ${seededCatalogue} built-in gifts are now editable rows in the catalogue.`,
        )
      } else {
        toast.success(draft.isNew ? "Gift added" : "Gift saved")
      }

      setDraft(null)
      await load()
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const gift = pendingDelete
    setPendingDelete(null)
    setSaving(true)
    try {
      await deleteGift(gift.id)
      toast.success(`${gift.label} removed`)
      await load()
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const gifts = catalog?.gifts ?? []

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#10141a]">Gift catalogue</h2>
          <p className="mt-1 text-sm text-[#4f4f4f]">
            What members can send, what it costs them, and what the creator earns.
          </p>
        </div>
        <Button onClick={() => setDraft(emptyGiftDraft())} disabled={loading || saving}>
          <Plus className="mr-2 size-4" aria-hidden="true" />
          Add a gift
        </Button>
      </div>

      {catalog?.fromDefaults && (
        /*
         * Before, not after. An admin who edits one price and discovers they have created
         * fifty rows should have been told it was going to happen.
         */
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">These are the built-in gifts</p>
          <p className="mt-1">
            Nothing has been saved yet, so members are seeing this list as a default. The first
            change you make saves all {gifts.length} of them as editable rows — after that, this
            catalogue is the only thing members see.
          </p>
        </div>
      )}

      {loading ? (
        <ul className="mt-5 space-y-2">
          {[0, 1, 2, 3, 4].map((row) => (
            <li key={row} className="flex items-center gap-3 p-3">
              <Skeleton className="size-9 rounded-2xl" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-16" />
            </li>
          ))}
        </ul>
      ) : failed ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-[#d7dde3] p-6">
          <p className="text-sm text-[#657080]">The catalogue could not be loaded.</p>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-2 size-4" aria-hidden="true" />
            Try again
          </Button>
        </div>
      ) : gifts.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-[#d7dde3] p-8 text-center">
          <p className="text-sm font-semibold text-[#4f5862]">No gifts</p>
          <p className="mt-1 text-sm text-[#8b95a1]">
            Members have nothing to send until you add one. The gift tray will be empty.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {SETS.filter((set) => gifts.some((gift) => gift.set === set)).map((set) => (
            <div key={set}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#8b95a1]">
                {GIFT_SET_LABELS[set] ?? set}
              </h3>
              <ul className="divide-y divide-[#eef1f3] overflow-hidden rounded-lg ring-1 ring-[#e2e6ea]">
                {gifts
                  .filter((gift) => gift.set === set)
                  .map((gift) => (
                    <GiftRow
                      key={gift.id}
                      gift={gift}
                      busy={saving}
                      onEdit={() => setDraft(giftDraftFrom(gift))}
                      onDelete={() => setPendingDelete(gift)}
                    />
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* ── the add / edit form ────────────────────────────────────────────── */}

      <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{draft?.isNew ? "Add a gift" : `Edit ${draft?.label}`}</DialogTitle>
            <DialogDescription>
              Changing a cost affects gifts sent from now on. Gifts already sent keep what they
              cost at the time.
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-4">
              <div>
                <label htmlFor="gift-label" className="text-sm font-medium text-[#10141a]">
                  Name
                </label>
                <Input
                  id="gift-label"
                  className="mt-1.5"
                  value={draft.label}
                  onChange={(e) => {
                    setDraft((d) => (d ? nextDraftForLabel(d, e.target.value) : d))
                  }}
                />
              </div>

              <div>
                <label htmlFor="gift-id" className="text-sm font-medium text-[#10141a]">
                  Id
                </label>
                <Input
                  id="gift-id"
                  className="mt-1.5 font-mono text-sm"
                  value={draft.id}
                  disabled={!draft.isNew}
                  onChange={(e) => setDraft((d) => (d ? { ...d, id: e.target.value } : d))}
                />
                <p className="mt-1 text-xs text-[#6b7280]">
                  {draft.isNew
                    ? "The icon is picked from the words in here, so name it after a real thing — rose_bouquet finds a rose, gift_7 finds nothing. It cannot be changed later."
                    : "An id cannot be changed — a different id would be a different gift."}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="gift-set" className="text-sm font-medium text-[#10141a]">
                    Set
                  </label>
                  <Select
                    value={draft.set}
                    onValueChange={(value) =>
                      setDraft((d) => (d ? { ...d, set: value as CowryGiftSetId } : d))
                    }
                  >
                    <SelectTrigger id="gift-set" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SETS.map((set) => (
                        <SelectItem key={set} value={set}>
                          {GIFT_SET_LABELS[set] ?? set}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label htmlFor="gift-cost" className="text-sm font-medium text-[#10141a]">
                    Cost in Cowries
                  </label>
                  <Input
                    id="gift-cost"
                    type="number"
                    min={1}
                    className="mt-1.5"
                    value={draft.cost}
                    onChange={(e) => setDraft((d) => (d ? { ...d, cost: e.target.value } : d))}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="gift-rate" className="text-sm font-medium text-[#10141a]">
                  Creator share <span className="font-normal text-[#8b95a1]">(optional)</span>
                </label>
                <Input
                  id="gift-rate"
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  className="mt-1.5"
                  placeholder="Platform default"
                  value={draft.creatorRate}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, creatorRate: e.target.value } : d))
                  }
                />
                <p className="mt-1 text-xs text-[#6b7280]">
                  How much of the cost is minted for the recipient. 0.5 is half. Never above 1 —
                  minting more than the sender spent would make gifting a way to print Cowries.
                </p>
              </div>

              <div>
                <label htmlFor="gift-icon" className="text-sm font-medium text-[#10141a]">
                  Icon override <span className="font-normal text-[#8b95a1]">(optional)</span>
                </label>
                <div className="mt-1.5 flex items-center gap-3">
                  <Input
                    id="gift-icon"
                    value={draft.icon}
                    placeholder="An emoji, or a name like crown"
                    onChange={(e) => setDraft((d) => (d ? { ...d, icon: e.target.value } : d))}
                  />
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f6f8]">
                    <GiftIcon
                      gift={{ id: draft.id, label: draft.label, icon: draft.icon.trim() }}
                      size={22}
                    />
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#6b7280]">
                  Only needed when the name does not suggest one. Leave it empty to go back to
                  matching by name — the preview shows what members will see.
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div>
                  <p className="text-sm font-medium text-[#10141a]">Sendable</p>
                  <p className="text-xs text-[#6b7280]">
                    Turn this off to take it out of the gift tray without deleting it.
                  </p>
                </div>
                <Switch
                  checked={draft.active}
                  onCheckedChange={(active) => setDraft((d) => (d ? { ...d, active } : d))}
                  aria-label="Sendable"
                />
              </div>

              {problem && <p className="text-sm text-[#b4232a]">{problem}</p>}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void commit()} disabled={saving || Boolean(problem)}>
              {draft?.isNew ? "Add gift" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── removing one ───────────────────────────────────────────────────── */}

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {pendingDelete?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              Members will no longer be able to send it. Gifts already sent are unaffected — each
              one recorded its own name and cost, so past gifts and creator earnings still read
              correctly. If you only want to stop it being sent, edit it and turn off
              &ldquo;Sendable&rdquo; instead, which can be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              className="bg-[#b4232a] hover:bg-[#8f1b21]"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
