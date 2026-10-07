import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Crown, Loader2, Pencil, Play, Plus, RefreshCw, Search, Trash2, X } from "lucide-react"
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
import { GiftSplash, type GiftSplashData } from "@/components/cowry/GiftSplash"
import { giftArrivalFor, type GiftArrival } from "@/components/cowry/giftAnimations"
import { GIFT_ICON_RULES } from "@/components/cowry/giftIcons"
import { formatCowries } from "@/utils/careconnect/cowry"
import { getAuthErrorMessage } from "@/utils/auth"
import { cn } from "@/lib/utils"
import {
  deleteGift,
  installTreasures,
  listAdminGifts,
  listGiftTaxonomy,
  rarityForCost,
  saveGift,
  taxonomyLabels,
  type CowryAdminGift,
  type CowryAdminGiftCatalog,
  type CowryGiftAvailability,
  type CowryGiftStatus,
  type CowryTaxonomy,
  type CowryTaxonomyItem,
} from "@/utils/careconnect/services/cowryAdminService"
import {
  emptyGiftDraft,
  giftDraftFrom,
  giftDraftProblem,
  giftDraftToInput,
  giftDraftWarnings,
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

/** What each full-screen arrival looks like, in a few words, for the legendary badge. */
const ARRIVAL_LABELS: Partial<Record<GiftArrival, string>> = {
  "rose-bloom": "Rose blooms",
  "thunder-strike": "Thunder strike",
  "eternal-flame": "Wall of flame",
  "rising-sun": "Sunrise",
  "city-of-lights": "City lights up",
  "eagle-flight": "Eagle flight",
  "lion-storm": "Lion in a storm",
  "earth-harvest": "Rain and a garden",
  "ancestral-mark": "Ancestral marks",
  "phoenix-rise": "Phoenix rises",
  "ocean-pearl": "Pearl revealed",
  "cowry-throne": "Cowry throne",
}

/**
 * The palette a category is coloured from.
 *
 * A lookup keyed by category name is no longer possible: an admin can add a category this
 * file has never heard of, and it would render in the fallback grey while every seeded one
 * had a colour — the new category would look broken rather than new. So a colour is derived
 * from the key instead. Stable for a given key, which is what matters: a category keeps the
 * same colour across reloads and across screens.
 */
const CATEGORY_TINTS = [
  "bg-[#eef1f3] text-[#565656]",
  "bg-[#fff4df] text-[#a8793f]",
  "bg-[#e0f2ff] text-[#0d8de0]",
  "bg-[#f1e8ff] text-[#7a4fd1]",
  "bg-[#e6f7ef] text-[#1b8a5a]",
  "bg-[#ffecec] text-[#c2453d]",
  "bg-[#e9ecff] text-[#4b57c4]",
  "bg-[#fdf0f6] text-[#b24a86]",
]

/** The premium tier keeps its gold, because the receiver's experience is built around it. */
const PREMIUM_TINT = "bg-[linear-gradient(135deg,#fff1c7,#f3c969)] text-[#7a5310]"
const PREMIUM_KEYS = new Set(["premium", "legendary"])

function tintFor(key?: string | null): string {
  if (!key) return CATEGORY_TINTS[0]
  if (PREMIUM_KEYS.has(key)) return PREMIUM_TINT
  let hash = 0
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return CATEGORY_TINTS[hash % CATEGORY_TINTS.length]
}

/** Which category a Treasure is in, tolerating rows written before Treasures. */
const categoryOf = (gift: { category?: string | null; set?: string | null }): string =>
  gift.category ?? gift.set ?? ""

/** Treasures an admin has taken out of circulation, and why, for the row badge. */
const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-[#eef1f3] text-[#657080]" },
  review: { label: "In cultural review", className: "bg-[#fff4df] text-[#a8793f]" },
  approved: { label: "Approved, not published", className: "bg-[#e0f2ff] text-[#0d8de0]" },
  paused: { label: "Paused", className: "bg-[#ffecec] text-[#c2453d]" },
  retired: { label: "Retired", className: "bg-[#eef1f3] text-[#657080]" },
}

const AVAILABILITY_LABELS: Record<CowryGiftAvailability, string> = {
  purchase: "Bought with Cowries",
  limited: "Limited edition",
  earn: "Earned",
  discover: "Discovered",
  event: "Event only",
  collection: "Collection reward",
}

const STATUS_LABELS: Record<CowryGiftStatus, string> = {
  draft: "Draft",
  review: "In cultural review",
  approved: "Approved",
  published: "Published",
  paused: "Paused",
  retired: "Retired",
}

/**
 * The value a Select uses for "none".
 *
 * Radix treats an empty string as "no value chosen" and refuses it as an item value, so an
 * optional picker needs a real token standing in for empty. Converted back to "" on change.
 */
const NONE = "__none__"

function GiftRow({
  gift,
  onEdit,
  onDelete,
  onPreview,
  showSet,
  categoryLabel,
  busy,
}: {
  gift: CowryAdminGift
  onEdit: () => void
  onDelete: () => void
  onPreview: () => void
  /** In search results, which set each gift is in. */
  showSet?: boolean
  /** Resolved by the parent, which holds the taxonomy. */
  categoryLabel?: string
  busy: boolean
}) {
  const inactive = gift.active === false
  const arrival = giftArrivalFor({ id: gift.id, label: gift.label, icon: gift.icon }, "received")
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
          tintFor(categoryOf(gift)),
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
          {showSet && (
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", tintFor(categoryOf(gift)))}>
              {categoryLabel ?? categoryOf(gift)}
            </span>
          )}
          {gift.status && gift.status !== "published" && STATUS_BADGES[gift.status] && (
            /*
             * Why a Treasure is not sendable, rather than only that it is not. "Paused" and
             * "in cultural review" are different decisions, and an admin scanning the list
             * should not have to open each one to tell them apart.
             */
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                STATUS_BADGES[gift.status].className,
              )}
            >
              {STATUS_BADGES[gift.status].label}
            </span>
          )}
          {gift.availability && gift.availability !== "purchase" && (
            <span className="rounded-full bg-[#eef1f3] px-2 py-0.5 text-[11px] font-semibold text-[#657080]">
              {AVAILABILITY_LABELS[gift.availability] ?? gift.availability}
            </span>
          )}
          {arrival !== "rain" && (
            /* The legendary tier is defined by this: say which scene the receiver gets. */
            <span className="inline-flex items-center gap-1 rounded-full bg-[linear-gradient(135deg,#fff1c7,#f3c969)] px-2 py-0.5 text-[11px] font-semibold text-[#7a5310]">
              <Crown className="size-3" aria-hidden="true" />
              {ARRIVAL_LABELS[arrival] ?? "Full screen"}
            </span>
          )}
          {arrival === "rain" && PREMIUM_KEYS.has(categoryOf(gift)) && (
            /* Legendary in the catalogue but a name the app has no scene for: it would
               arrive like any other gift, which is worth knowing before members pay for it. */
            <span
              className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200"
              title="The app has no full-screen scene for this name, so it arrives like any other gift"
            >
              No full-screen scene
            </span>
          )}
        </p>
        <p className="truncate text-xs text-[#8b95a1]">
          {gift.id}
          {gift.creatorRate !== undefined && gift.creatorRate !== null ? (
            <>
              {" "}
              · creator earns{" "}
              <span className="font-semibold text-[#1f9c4c]">{formatCowries(Math.floor(gift.cost * gift.creatorRate))}</span>{" "}
              ({Math.round(gift.creatorRate * 100)}%)
            </>
          ) : (
            <> · creator earns the platform default share</>
          )}
        </p>
      </div>

      <p className="flex shrink-0 items-center gap-1 text-sm font-bold tabular-nums text-[#141922]">
        <CowryIcon size={14} />
        {formatCowries(gift.cost)}
      </p>

      <div className="flex shrink-0 gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPreview}
          aria-label={`Preview ${gift.label} as a receiver sees it`}
          title="Preview as a receiver sees it"
          className="text-[#00868a] hover:bg-[#e6f8f8]"
        >
          <Play className="size-4" aria-hidden="true" />
        </Button>
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
  const [taxonomy, setTaxonomy] = useState<CowryTaxonomy | null>(null)
  const [installing, setInstalling] = useState(false)
  /** Empty until the taxonomy arrives, because the first category is no longer knowable. */
  const [activeSet, setActiveSet] = useState<string>("")
  const [query, setQuery] = useState("")
  const [preview, setPreview] = useState<GiftSplashData | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [iconFilter, setIconFilter] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      // Both together. The catalogue is unreadable without the taxonomy — every Treasure
      // stores a category key, and a key with no label is not something to show an admin.
      const [nextCatalog, nextTaxonomy] = await Promise.all([listAdminGifts(), listGiftTaxonomy()])
      setCatalog(nextCatalog)
      setTaxonomy(nextTaxonomy)
      setActiveSet((current) => {
        const live = nextTaxonomy.categories.filter((row) => row.active !== false)
        // Hold the current tab if it still exists, so a save does not jump the admin
        // back to the first category every time.
        if (current && live.some((row) => row.key === current)) return current
        return live[0]?.key ?? ""
      })
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function install() {
    setInstalling(true)
    try {
      const result = await installTreasures()
      const retired = result.retired
        ? ` ${result.retired} older gift${result.retired === 1 ? " was" : "s were"} retired, not deleted.`
        : ""
      toast.success(
        `${result.installed} Treasures installed, ${result.updated} refreshed.${retired}`,
      )
      await load()
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setInstalling(false)
    }
  }

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

  const gifts = useMemo(() => catalog?.gifts ?? [], [catalog])

  /** Only live categories get a tab. Retired ones still resolve a label for old Treasures. */
  const categories = useMemo(
    () => (taxonomy?.categories ?? []).filter((row) => row.active !== false),
    [taxonomy],
  )
  const rarities = useMemo(
    () => (taxonomy?.rarities ?? []).filter((row) => row.active !== false),
    [taxonomy],
  )
  const collections = useMemo(
    () => (taxonomy?.collections ?? []).filter((row) => row.active !== false),
    [taxonomy],
  )

  /** Includes retired rows: a Treasure filed under one still has to render its name. */
  const categoryLabels = useMemo(
    () => taxonomyLabels(taxonomy?.categories ?? []),
    [taxonomy],
  )
  const rarityLabels = useMemo(() => taxonomyLabels(taxonomy?.rarities ?? []), [taxonomy])

  /**
   * The rarity whose band this cost falls in.
   *
   * A suggestion rather than an assignment: the bands are admin-edited and overlap once
   * someone changes them, and a Treasure's rarity is a decision rather than a function of
   * its price. Surfaced as a warning when it disagrees with what was chosen.
   */
  const suggestedRarity = draft
    ? (rarityForCost(rarities, Number(draft.cost))?.key ?? null)
    : null
  const warnings = draft && !problem ? giftDraftWarnings(draft, suggestedRarity) : []

  const counts = useMemo(() => {
    const next: Record<string, number> = {}
    for (const gift of gifts) {
      const key = categoryOf(gift)
      next[key] = (next[key] ?? 0) + 1
    }
    return next
  }, [gifts])

  // Searching looks across every set; otherwise the tab's own gifts, cheapest first.
  const needle = query.trim().toLowerCase()
  const shown = needle
    ? gifts.filter((gift) => `${gift.label} ${gift.id}`.toLowerCase().includes(needle))
    : gifts.filter((gift) => categoryOf(gift) === activeSet).sort((a, b) => a.cost - b.cost)

  /** Plays the gift exactly as a receiver would get it — full screen for the legendary. */
  const previewGift = (gift: CowryAdminGift) =>
    setPreview({
      key: `admin-preview-${gift.id}-${Date.now()}`,
      gift: { id: gift.id, label: gift.label, icon: gift.icon },
      set: categoryOf(gift),
      cost: gift.cost,
      senderName: "Preview",
      message: "This is how it arrives.",
      // Only when the gift sets its own share; the platform default is not known here.
      creatorAmount: gift.creatorRate != null ? Math.floor(gift.cost * gift.creatorRate) : null,
      direction: "received",
    })

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#10141a]">Gift catalogue</h2>
          <p className="mt-1 text-sm text-[#4f4f4f]">
            What members can send, what it costs them, and what the creator earns.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/*
            * Offered only while the Treasures are not already in. Seeding fires only on an
            * environment that has never had a catalogue, so an environment still holding the
            * gifts that came before Treasures would never pick them up on its own.
            */}
          {!loading && gifts.length > 0 && !gifts.some((gift) => gift.id === "new_dawn") && (
            <Button variant="outline" onClick={() => void install()} disabled={installing || saving}>
              {installing ? "Installing…" : "Install Treasures"}
            </Button>
          )}
          <Button
            onClick={() => setDraft({ ...emptyGiftDraft(activeSet) })}
            disabled={loading || saving || categories.length === 0}
          >
            <Plus className="mr-2 size-4" aria-hidden="true" />
            Add a Treasure
          </Button>
        </div>
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
        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-3">
            {/* One tab per set — the gift tray's own sets, legendary in gold as it is there. */}
            <div
              role="tablist"
              aria-label="Gift sets"
              className={cn(
                "scrollbar-hide flex flex-1 gap-1.5 overflow-x-auto rounded-full bg-[#f4f6f8] p-1",
                needle && "opacity-50",
              )}
            >
              {categories.map((category) => {
                const set = category.key
                const active = !needle && activeSet === set
                const legendary = PREMIUM_KEYS.has(set)
                return (
                  <button
                    key={set}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setActiveSet(set)
                      setQuery("")
                    }}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all duration-200",
                      legendary
                        ? active
                          ? "legendary-shine relative overflow-hidden bg-[linear-gradient(135deg,#f3c969,#c8963e)] text-white shadow"
                          : "text-[#a8793f] hover:bg-[#fff4df]"
                        : active
                          ? "bg-white text-[#10141a] shadow"
                          : "text-[#4f4f4f] hover:bg-white/70",
                    )}
                  >
                    {legendary && <Crown className="size-3.5" aria-hidden="true" />}
                    {category.label}
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-xs tabular-nums",
                        active ? (legendary ? "bg-white/25" : "bg-[#eef1f3]") : "bg-white/70 text-[#8b95a1]",
                      )}
                    >
                      {counts[set] ?? 0}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8b95a1]" aria-hidden="true" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search all gifts"
                aria-label="Search all gifts"
                className="rounded-full pl-9 pr-8"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#8b95a1] hover:bg-[#eef1f3]"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {!needle && PREMIUM_KEYS.has(activeSet) && (
            <p className="animate-fadeIn mt-3 flex items-center gap-2 rounded-xl bg-[linear-gradient(90deg,#fff4df,#fffaf0)] px-3 py-2 text-xs text-[#7a5310] ring-1 ring-[#f0dcae]">
              <Crown className="size-4 shrink-0 text-[#c8963e]" aria-hidden="true" />
              Legendary gifts arrive full screen on the receiver&apos;s side, each with its own scene and
              sound and a &ldquo;Congratulations on the (amount) Gift&rdquo; caption. A gift only gets a
              scene when its name is one the app knows: the gold badge says which. Press play to watch it.
            </p>
          )}

          {shown.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-[#d7dde3] p-8 text-center">
              <p className="text-sm font-semibold text-[#4f5862]">
                {needle
                  ? `No Treasure matches "${query.trim()}"`
                  : `No ${categoryLabels.get(activeSet) ?? activeSet} Treasures`}
              </p>
              <p className="mt-1 text-sm text-[#8b95a1]">
                {needle ? "Search looks at names and ids across every set." : "This tab is hidden from the gift tray until one is added."}
              </p>
            </div>
          ) : (
            <ul
              key={needle ? "search" : activeSet}
              role="tabpanel"
              className="animate-fade-in-up mt-4 divide-y divide-[#eef1f3] overflow-hidden rounded-lg ring-1 ring-[#e2e6ea]"
            >
              {shown.map((gift) => (
                <GiftRow
                  key={gift.id}
                  gift={gift}
                  busy={saving}
                  showSet={Boolean(needle)}
                  categoryLabel={categoryLabels.get(categoryOf(gift))}
                  onEdit={() => setDraft(giftDraftFrom(gift))}
                  onDelete={() => setPendingDelete(gift)}
                  onPreview={() => previewGift(gift)}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── the add / edit form ────────────────────────────────────────────── */}

      <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && setDraft(null)}>
        {/* A column: the title and the buttons stay put, and only the form between them
            scrolls — the icon picker can make it taller than a laptop screen. */}
        <DialogContent showCloseButton className="flex max-h-[min(90vh,780px)] flex-col overflow-hidden sm:max-w-xl">
          <DialogHeader className="shrink-0 border-b border-[#eef1f3] pb-4 pr-16">
            <div className="flex items-center gap-3">
              {draft && (
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#f4f6f8]">
                  <GiftIcon gift={{ id: draft.id, label: draft.label, icon: draft.icon.trim() }} size={30} />
                </span>
              )}
              <div className="min-w-0">
                <DialogTitle className="truncate text-lg font-semibold text-[#10141a]">
                  {draft?.isNew ? "Add a gift" : `Edit ${draft?.label}`}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Changing a cost affects gifts sent from now on. Gifts already sent keep what
                  they cost at the time.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {draft && (
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
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
                  <label htmlFor="gift-category" className="text-sm font-medium text-[#10141a]">
                    Category
                  </label>
                  <Select
                    value={draft.category}
                    onValueChange={(value) =>
                      setDraft((d) => (d ? { ...d, category: value } : d))
                    }
                  >
                    <SelectTrigger id="gift-category" className="mt-1.5">
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((row) => (
                        <SelectItem key={row.key} value={row.key}>
                          {row.label}
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
                    min={0}
                    className="mt-1.5"
                    value={draft.cost}
                    onChange={(e) => setDraft((d) => (d ? { ...d, cost: e.target.value } : d))}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="gift-rarity" className="text-sm font-medium text-[#10141a]">
                    Rarity <span className="font-normal text-[#8b95a1]">(optional)</span>
                  </label>
                  <Select
                    value={draft.rarity || NONE}
                    onValueChange={(value) =>
                      setDraft((d) => (d ? { ...d, rarity: value === NONE ? "" : value } : d))
                    }
                  >
                    <SelectTrigger id="gift-rarity" className="mt-1.5">
                      <SelectValue placeholder="No rarity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No rarity</SelectItem>
                      {rarities.map((row) => (
                        <SelectItem key={row.key} value={row.key}>
                          {row.label}
                          {Number.isFinite(row.minCost) ? ` · ${row.minCost}${row.maxCost ? `–${row.maxCost}` : "+"}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {suggestedRarity && suggestedRarity !== draft.rarity && (
                    <p className="mt-1.5 text-xs text-[#8b95a1]">
                      That cost falls in the {rarityLabels.get(suggestedRarity) ?? suggestedRarity} band.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="gift-collection" className="text-sm font-medium text-[#10141a]">
                    Collection <span className="font-normal text-[#8b95a1]">(optional)</span>
                  </label>
                  <Select
                    value={draft.collection || NONE}
                    onValueChange={(value) =>
                      setDraft((d) => (d ? { ...d, collection: value === NONE ? "" : value } : d))
                    }
                  >
                    <SelectTrigger id="gift-collection" className="mt-1.5">
                      <SelectValue placeholder="Not in a collection" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Not in a collection</SelectItem>
                      {collections.map((row) => (
                        <SelectItem key={row.key} value={row.key}>
                          {row.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="gift-availability" className="text-sm font-medium text-[#10141a]">
                    How it is obtained
                  </label>
                  <Select
                    value={draft.availability}
                    onValueChange={(value) =>
                      setDraft((d) => (d ? { ...d, availability: value as CowryGiftAvailability } : d))
                    }
                  >
                    <SelectTrigger id="gift-availability" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(AVAILABILITY_LABELS) as CowryGiftAvailability[]).map((key) => (
                        <SelectItem key={key} value={key}>
                          {AVAILABILITY_LABELS[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label htmlFor="gift-status" className="text-sm font-medium text-[#10141a]">
                    Status
                  </label>
                  <Select
                    value={draft.status}
                    onValueChange={(value) =>
                      setDraft((d) => (d ? { ...d, status: value as CowryGiftStatus } : d))
                    }
                  >
                    <SelectTrigger id="gift-status" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_LABELS) as CowryGiftStatus[]).map((key) => (
                        <SelectItem key={key} value={key}>
                          {STATUS_LABELS[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1.5 text-xs text-[#8b95a1]">
                    Only a published Treasure can be sent.
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="gift-meaning" className="text-sm font-medium text-[#10141a]">
                  What it means
                </label>
                <Input
                  id="gift-meaning"
                  className="mt-1.5"
                  placeholder="New beginnings"
                  value={draft.meaning}
                  onChange={(e) => setDraft((d) => (d ? { ...d, meaning: e.target.value } : d))}
                />
                <p className="mt-1.5 text-xs text-[#8b95a1]">
                  Shown to the receiver when the Treasure arrives.
                </p>
              </div>

              <div>
                <label htmlFor="gift-story" className="text-sm font-medium text-[#10141a]">
                  Its story <span className="font-normal text-[#8b95a1]">(optional)</span>
                </label>
                <textarea
                  id="gift-story"
                  rows={3}
                  className="mt-1.5 w-full rounded-md border border-[#d7dde3] px-3 py-2 text-sm"
                  placeholder="Left empty until someone has checked it."
                  value={draft.story}
                  onChange={(e) => setDraft((d) => (d ? { ...d, story: e.target.value } : d))}
                />
                <p className="mt-1.5 text-xs text-[#8b95a1]">
                  Never write an invented story as though it were established history. Leave this
                  empty rather than guessing.
                </p>
              </div>

              <div className="rounded-lg border border-[#e2e6ea] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#10141a]">Needs cultural review</p>
                    <p className="mt-1 text-xs text-[#8b95a1]">
                      For anything drawing on a real culture, history or symbol.
                    </p>
                  </div>
                  <Switch
                    checked={draft.culturalReviewRequired}
                    onCheckedChange={(checked) =>
                      setDraft((d) => (d ? { ...d, culturalReviewRequired: checked } : d))
                    }
                  />
                </div>
                {draft.culturalReviewRequired && (
                  <Input
                    className="mt-3"
                    placeholder="What has to be checked before this is published?"
                    value={draft.culturalReviewNote}
                    onChange={(e) =>
                      setDraft((d) => (d ? { ...d, culturalReviewNote: e.target.value } : d))
                    }
                  />
                )}
              </div>

              {(draft.availability === "limited" || draft.quantity.trim()) && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="gift-quantity" className="text-sm font-medium text-[#10141a]">
                      Print run
                    </label>
                    <Input
                      id="gift-quantity"
                      type="number"
                      min={1}
                      className="mt-1.5"
                      placeholder="Unlimited"
                      value={draft.quantity}
                      onChange={(e) => setDraft((d) => (d ? { ...d, quantity: e.target.value } : d))}
                    />
                  </div>
                  <div>
                    <label htmlFor="gift-from" className="text-sm font-medium text-[#10141a]">
                      Available from
                    </label>
                    <Input
                      id="gift-from"
                      type="date"
                      className="mt-1.5"
                      value={draft.availableFrom}
                      onChange={(e) =>
                        setDraft((d) => (d ? { ...d, availableFrom: e.target.value } : d))
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="gift-to" className="text-sm font-medium text-[#10141a]">
                      Available until
                    </label>
                    <Input
                      id="gift-to"
                      type="date"
                      className="mt-1.5"
                      value={draft.availableTo}
                      onChange={(e) =>
                        setDraft((d) => (d ? { ...d, availableTo: e.target.value } : d))
                      }
                    />
                  </div>
                </div>
              )}

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

                {/* Every icon the app can draw, to pick from rather than guess a key. */}
                <button
                  type="button"
                  onClick={() => setPickerOpen((open) => !open)}
                  className="mt-2 text-xs font-semibold text-[#00868a] hover:underline"
                  aria-expanded={pickerOpen}
                >
                  {pickerOpen ? "Hide the icons" : "Choose from the icons"}
                </button>
                {pickerOpen && (
                  <div className="animate-fadeIn mt-2 rounded-xl border border-[#e2e6ea] p-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={iconFilter}
                        onChange={(e) => setIconFilter(e.target.value)}
                        placeholder="Filter, e.g. flower"
                        aria-label="Filter icons"
                        className="h-8 text-sm"
                      />
                      {draft.icon && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDraft((d) => (d ? { ...d, icon: "" } : d))}
                        >
                          Match by name
                        </Button>
                      )}
                    </div>
                    <div className="mt-2 grid max-h-48 grid-cols-6 gap-1 overflow-y-auto sm:grid-cols-8">
                      {GIFT_ICON_RULES.filter((rule) => {
                        const needle = iconFilter.trim().toLowerCase()
                        return !needle || rule.key.includes(needle) || rule.match.some((word) => word.includes(needle))
                      }).map((rule) => {
                        const chosen = draft.icon.trim().toLowerCase() === rule.key
                        return (
                          <button
                            key={rule.key}
                            type="button"
                            title={rule.key}
                            aria-label={`Use the ${rule.key} icon`}
                            aria-pressed={chosen}
                            onClick={() => setDraft((d) => (d ? { ...d, icon: rule.key } : d))}
                            className={cn(
                              "flex aspect-square items-center justify-center rounded-lg transition hover:bg-[#f2f6f8]",
                              chosen && "bg-[#e6f8f8] ring-2 ring-[#00b3ad]",
                            )}
                          >
                            <GiftIcon gift={{ icon: rule.key }} size={24} />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
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

          {warnings.length > 0 && (
            /*
             * Judgements, not errors — an admin may overrule any of them, so these sit
             * beside the save button rather than blocking it. Publishing something still in
             * cultural review is the one that matters, and it is their call to make.
             */
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <ul className="list-disc space-y-1 pl-4">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter className="shrink-0 border-t border-[#eef1f3] pt-4">
            <Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>
              Cancel
            </Button>
            {/* Its own green, not the theme's primary — which the admin shell does not set,
                and which left this button blank on a white dialog. */}
            <Button
              onClick={() => void commit()}
              disabled={saving || Boolean(problem)}
              className="bg-[#1f9c4c] text-white shadow-[0_6px_16px_-6px_rgba(31,156,76,0.6)] hover:bg-[#178a42] hover:opacity-100"
            >
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
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

      {preview && <GiftSplash key={preview.key} data={preview} onDone={() => setPreview(null)} />}
    </section>
  )
}
