import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import { Crown, Loader2 } from "lucide-react"
import { TreasureChest } from "@/components/cowry/TreasureChest"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { CowryAmount } from "@/components/cowry/CowryIcon"
import { GiftIcon } from "@/components/cowry/GiftIcon"
import { giftColor } from "@/components/cowry/giftIcons"
import { playGiftSplash } from "@/components/cowry/giftPreview"
import { isGoldTab, missingFromCatalogue, trayTabs } from "@/components/cowry/giftTraySelection"
import { cn } from "@/lib/utils"
import { haptic } from "@/lib/haptics"
import { Routes } from "@/routes/constants"
import { getAuthErrorMessage } from "@/utils/auth"
import {
  getGiftCatalog,
  sendGift,
  type CowryGiftCatalog,
  type CowryGiftCatalogItem,
  type CowryGiftSet,
} from "@/utils/careconnect/services/cowryService"
import {
  GIFT_REFUSAL_MESSAGES,
  formatCowries,
} from "@/utils/careconnect/cowry"

/**
 * Gift tray.
 *
 * Opens over whatever it is sent from — a profile today, a post once posts exist — which
 * is why it is a component rather than a route.
 *
 * Two things it is careful about. The animation plays only after the server confirms the
 * spend, because a gift shown on tap is a gift that may never have been paid for. And
 * gifts the sender cannot afford are dimmed rather than hidden: seeing the next tier is
 * most of why anyone buys more Cowries.
 */

interface GiftTrayProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipientId: string
  recipientName?: string | null
  targetType?: "post" | "profile"
  targetId?: string | null
  /** Called after a gift lands, so the host can refresh its own list. */
  onSent?: () => void
}

/** How long the confirmation stays up before the tray closes itself. */
const CELEBRATION_MS = 1800

export function GiftTray({
  open,
  onOpenChange,
  recipientId,
  recipientName,
  targetType = "profile",
  targetId = null,
  onSent,
}: GiftTrayProps) {
  const [catalog, setCatalog] = useState<CowryGiftCatalog | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeSet, setActiveSet] = useState<CowryGiftSet>("everyday")
  const [selected, setSelected] = useState<CowryGiftCatalogItem | null>(null)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<CowryGiftCatalogItem | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const result = await getGiftCatalog()
        if (!active) return
        setCatalog(result)
      } catch (error) {
        toast.error(getAuthErrorMessage(error))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [open])

  // Reset when the tray closes, so reopening it does not show a stale celebration.
  useEffect(() => {
    if (open) return
    setSelected(null)
    setMessage("")
    setSent(null)
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [open])

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    },
    [],
  )

  // The tabs and what each holds: the catalogue's own categories, in its order and with its
  // labels (giftTraySelection.ts) — so a category an admin adds appears without a release.
  const tabs = useMemo(() => (catalog ? trayTabs(catalog) : []), [catalog])
  const bySet = useMemo(() => new Map(tabs.map((tab) => [tab.id, tab.gifts])), [tabs])
  // Whatever tab was open may not exist in this catalogue; fall back to the first.
  const currentSet: CowryGiftSet = bySet.has(activeSet) ? activeSet : (tabs[0]?.id ?? activeSet)

  // The Legendary tab's gifts, by id — styled gold whatever set the backend filed them in.
  // The top tier's gifts, by id — Premium (or Legendary), styled gold whatever set they are filed in.
  const legendaryIds = useMemo(
    () => new Set(tabs.filter(isGoldTab).flatMap((tab) => tab.gifts.map((gift) => gift.id))),
    [tabs],
  )
  const currentIsGold = tabs.some((tab) => tab.id === currentSet && isGoldTab(tab))
  const isLegendary = (gift: CowryGiftCatalogItem) => legendaryIds.has(gift.id)

  // While developing, say plainly which chosen gifts the catalogue does not have.
  useEffect(() => {
    if (!import.meta.env.DEV || !catalog) return
    const missing = missingFromCatalogue(catalog.gifts)
    if (missing.length) {
      console.warn(
        "Treasure tray: these chosen treasures are not in the catalogue, so they are not shown. Add them to the backend catalogue, or match their spelling in giftTraySelection.ts:",
        missing.map((item) => `${item.set}: ${item.name}`),
      )
    }
  }, [catalog])

  const balance = catalog?.purchasedAvailable ?? 0

  async function confirmSend() {
    if (!selected) return
    setSending(true)
    try {
      const result = await sendGift({
        giftId: selected.id,
        recipientId,
        targetType,
        targetId,
        message: message.trim() || undefined,
        // Bound to this attempt so a double tap cannot send twice.
        idempotencyKey: `${selected.id}_${recipientId}_${Date.now()}`,
      })

      if (!result.ok) {
        toast.error(GIFT_REFUSAL_MESSAGES[result.reason ?? ""] ?? "That treasure couldn't be sent.")
        return
      }

      // Only now. The server has taken the Cowries.
      setSent(selected)
      haptic("success")
      // The gift's own icon rains down for the sender too — the same moment the receiver
      // gets, so both sides see what was given.
      playGiftSplash({
        key: `sent-${result.gift?.id ?? Date.now()}`,
        gift: { id: selected.id, label: selected.label, icon: selected.icon },
        set: selected.set,
        cost: selected.cost,
        recipientName,
        message: message.trim() || null,
        direction: "sent",
      })
      setCatalog((current) =>
        current ? { ...current, purchasedAvailable: current.purchasedAvailable - selected.cost } : current,
      )
      onSent?.()
      closeTimer.current = setTimeout(() => onOpenChange(false), CELEBRATION_MS)
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {sent ? (
          <DialogBody className="py-10 text-center">
            {/* The celebration, shown only once the spend is confirmed. */}
            <div className="relative flex items-center justify-center mx-auto size-20">
              <span
                className="absolute rounded-full animate-check-ring size-16"
                style={{ backgroundColor: giftColor(sent) }}
              />
              <span className="animate-cowry-pop relative flex size-16 items-center justify-center rounded-full bg-white shadow-[0_8px_20px_-8px_rgba(16,20,26,0.45)]">
                <GiftIcon gift={sent} size={34} />
              </span>
            </div>
            <p className="mt-4 text-lg font-bold text-[#141922]">{sent.label} sent</p>
            <p className="mt-1 text-sm text-[#657080]">
              {recipientName ? `${recipientName} will see it on their profile.` : "It's on its way."}
            </p>
            <Button type="button" variant="outline" className="mt-6 rounded-full px-8" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogBody>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TreasureChest className="size-5 text-[#00b4b8]" aria-hidden="true" />
                Send a treasure
                {recipientName && <span className="font-normal text-[#657080]">to {recipientName}</span>}
              </DialogTitle>
            </DialogHeader>

            <DialogBody className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-[#f7f9fb] px-4 py-3 text-sm">
                <span className="text-[#657080]">Your bought Cowries</span>
                <CowryAmount amount={balance} size={18} className="font-semibold" />
              </div>

              {loading && (
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))}
                </div>
              )}

              {!loading && catalog && (
                <>
                  <div className="flex flex-wrap gap-2">
                    {tabs.map(({ id: set, label: setLabel }) =>
                      isGoldTab({ id: set, label: setLabel }) ? (
                        // The top tier gets the most presence: gold, a crown, a moving shine.
                        <button
                          key={set}
                          type="button"
                          onClick={() => setActiveSet(set)}
                          aria-pressed={currentSet === set}
                          className={cn(
                            "legendary-shine relative inline-flex items-center gap-1.5 overflow-hidden rounded-full px-3.5 py-1.5 text-xs font-bold transition",
                            currentSet === set
                              ? "bg-[linear-gradient(135deg,#7a5310,#c8963e_45%,#f3c969)] text-white shadow-[0_6px_16px_-6px_rgba(200,150,62,0.9)]"
                              : "bg-[linear-gradient(135deg,#fff4df,#fbe3a0)] text-[#7a5310] ring-1 ring-[#e8d1a0] hover:ring-[#c8963e]",
                          )}
                        >
                          <Crown className="size-3.5" aria-hidden="true" />
                          {setLabel}
                        </button>
                      ) : (
                        <button
                          key={set}
                          type="button"
                          onClick={() => setActiveSet(set)}
                          aria-pressed={currentSet === set}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            currentSet === set
                              ? "bg-[#10141a] text-white"
                              : "bg-[#eef1f3] text-[#565656] hover:bg-[#e2e6ea]"
                          }`}
                        >
                          {setLabel}
                        </button>
                      ),
                    )}
                  </div>

                  {currentIsGold && (
                    <p className="animate-fadeIn flex items-center gap-2 rounded-xl bg-[linear-gradient(90deg,#fff4df,#fffaf0)] px-3 py-2 text-xs text-[#7a5310] ring-1 ring-[#f0dcae]">
                      <Crown className="size-4 shrink-0 text-[#c8963e]" aria-hidden="true" />
                      The rarest treasures on Care Connect — they arrive in style on the receiver&apos;s screen.
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2 pr-1 overflow-y-auto max-h-72">
                    {(bySet.get(currentSet) ?? []).map((gift) => {
                      const affordable = balance >= gift.cost
                      const active = selected?.id === gift.id
                      if (isLegendary(gift)) {
                        return (
                          <button
                            key={gift.id}
                            type="button"
                            onClick={() => setSelected(gift)}
                            aria-pressed={active}
                            className={cn(
                              "cowry-press cowry-hover legendary-shine relative overflow-hidden rounded-2xl border-2 p-3 text-center transition",
                              "bg-[radial-gradient(circle_at_50%_0%,#fff8e6,#fbeed2_60%,#f1d9a4)]",
                              active
                                ? "border-[#c8963e] shadow-[0_10px_24px_-10px_rgba(200,150,62,0.9)]"
                                : "border-[#e8d1a0] hover:border-[#c8963e]",
                              !affordable && "opacity-60",
                            )}
                          >
                            <span className="mx-auto mb-1.5 flex size-11 items-center justify-center">
                              <GiftIcon gift={gift} size={36} />
                            </span>
                            <span className="block truncate text-xs font-bold text-[#5a3b0c]">{gift.label}</span>
                            <CowryAmount amount={gift.cost} size={12} className="mt-1 text-xs font-bold text-[#7a5310]" />
                          </button>
                        )
                      }
                      return (
                        <button
                          key={gift.id}
                          type="button"
                          onClick={() => setSelected(gift)}
                          aria-pressed={active}
                          // Dimmed, not hidden: seeing the next tier is most of why
                          // anyone buys more Cowries.
                          className={`cowry-press cowry-hover rounded-xl border-2 p-2.5 text-center transition ${
                            active
                              ? "border-[#00b4b8] bg-[#effbfb]"
                              : "border-[#e2e6ea] bg-white hover:border-[#c8cdd4]"
                          } ${affordable ? "" : "opacity-55"}`}
                        >
                          {/* Each gift wears its own icon — see giftIcons.ts. */}
                          <span className="flex items-center justify-center mx-auto mb-1 cowry-wobble size-8">
                            <GiftIcon gift={gift} size={26} />
                          </span>
                          <span className="block truncate text-xs font-medium text-[#141922]">
                            {gift.label}
                          </span>
                          <CowryAmount amount={gift.cost} size={12} className="mt-1 text-xs text-[#657080]" />
                        </button>
                      )
                    })}
                  </div>

                  {selected && (
                    <div
                      key={selected.id}
                      className={cn(
                        "animate-fade-in-up space-y-3 rounded-xl border p-4",
                        isLegendary(selected)
                          ? "border-[#e8d1a0] bg-[linear-gradient(180deg,#fffaf0,#ffffff)]"
                          : "border-[#e2e6ea]",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 font-semibold">
                          <GiftIcon gift={selected} size={isLegendary(selected) ? 28 : 22} />
                          {selected.label}
                        </span>
                        <CowryAmount amount={selected.cost} size={16} className="text-[#565656]" />
                      </div>

                      <Input
                        maxLength={200}
                        placeholder="Add a short message (optional)"
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        aria-label="Message with your treasure"
                      />

                      <p className="text-xs text-[#657080]">
                        Balance afterwards: {formatCowries(balance - selected.cost)}. Your name is
                        shown with the treasure.
                      </p>

                      {balance >= selected.cost ? (
                        <Button
                          className={cn(
                            "w-full",
                            isLegendary(selected)
                              ? "bg-[linear-gradient(135deg,#7a5310,#c8963e_50%,#e0b04e)] shadow-[0_8px_20px_-8px_rgba(200,150,62,0.9)]"
                              : "bg-[#00898c]",
                          )}
                          onClick={confirmSend}
                          disabled={sending}
                        >
                          {sending ? (
                            <>
                              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                              Sending…
                            </>
                          ) : (
                            `Send ${selected.label}`
                          )}
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-[#b4372c]">
                            You need {formatCowries(selected.cost - balance)} more bought Cowries.
                          </p>
                          <Button asChild variant="outline" className="w-full">
                            <Link to={Routes.app.user.cowryBuy}>Buy Cowries</Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </DialogBody>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
