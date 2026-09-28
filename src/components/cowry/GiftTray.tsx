import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import { Check, Gift, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { CowryAmount, CowryIcon } from "@/components/cowry/CowryIcon"
import { celebrateCowries } from "@/components/cowry/celebrate"
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
  GIFT_SET_LABELS,
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

const SET_ORDER: CowryGiftSet[] = ["everyday", "warm", "bold", "rare", "legendary"]

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
  const [sentLabel, setSentLabel] = useState<string | null>(null)
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
    setSentLabel(null)
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [open])

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    },
    [],
  )

  const bySet = useMemo(() => {
    const groups = new Map<CowryGiftSet, CowryGiftCatalogItem[]>()
    for (const gift of catalog?.gifts ?? []) {
      const list = groups.get(gift.set) ?? []
      list.push(gift)
      groups.set(gift.set, list)
    }
    return groups
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
        toast.error(GIFT_REFUSAL_MESSAGES[result.reason ?? ""] ?? "That gift couldn't be sent.")
        return
      }

      // Only now. The server has taken the Cowries.
      setSentLabel(selected.label)
      celebrateCowries(selected.set === "legendary" || selected.set === "rare" ? "shower" : "burst")
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
        {sentLabel ? (
          <DialogBody className="py-10 text-center">
            {/* The celebration, shown only once the spend is confirmed. */}
            <div className="relative mx-auto flex size-20 items-center justify-center">
              <span className="animate-check-ring absolute size-16 rounded-full bg-[#00b4b8]" />
              <span className="animate-cowry-pop relative flex size-16 items-center justify-center rounded-full bg-[#00b4b8]">
                <Check className="size-8 text-white" aria-hidden="true" />
              </span>
              <CowryIcon size={26} className="animate-cowry-pop absolute -right-1 -top-1 [animation-delay:250ms]" />
            </div>
            <p className="mt-4 text-lg font-bold text-[#141922]">{sentLabel} sent</p>
            <p className="mt-1 text-sm text-[#657080]">
              {recipientName ? `${recipientName} will see it on their profile.` : "It's on its way."}
            </p>
          </DialogBody>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="size-5 text-[#00b4b8]" aria-hidden="true" />
                Send a gift
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
                    {SET_ORDER.filter((set) => bySet.has(set)).map((set) => (
                      <button
                        key={set}
                        type="button"
                        onClick={() => setActiveSet(set)}
                        aria-pressed={activeSet === set}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          activeSet === set
                            ? "bg-[#10141a] text-white"
                            : "bg-[#eef1f3] text-[#565656] hover:bg-[#e2e6ea]"
                        }`}
                      >
                        {GIFT_SET_LABELS[set] ?? set}
                      </button>
                    ))}
                  </div>

                  <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto pr-1">
                    {(bySet.get(activeSet) ?? []).map((gift) => {
                      const affordable = balance >= gift.cost
                      const active = selected?.id === gift.id
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
                          <Gift
                            className={`cowry-wobble mx-auto mb-1 size-5 ${active ? "text-[#00b4b8]" : "text-[#9aa4b2]"}`}
                            aria-hidden="true"
                          />
                          <span className="block truncate text-xs font-medium text-[#141922]">
                            {gift.label}
                          </span>
                          <CowryAmount amount={gift.cost} size={12} className="mt-1 text-xs text-[#657080]" />
                        </button>
                      )
                    })}
                  </div>

                  {selected && (
                    <div key={selected.id} className="animate-fade-in-up space-y-3 rounded-xl border border-[#e2e6ea] p-4">
                      <div className="flex items-baseline justify-between">
                        <span className="font-semibold">{selected.label}</span>
                        <CowryAmount amount={selected.cost} size={16} className="text-[#565656]" />
                      </div>

                      <Input
                        maxLength={200}
                        placeholder="Add a short message (optional)"
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        aria-label="Message with your gift"
                      />

                      <p className="text-xs text-[#657080]">
                        Balance afterwards: {formatCowries(balance - selected.cost)}. Your name is
                        shown with the gift.
                      </p>

                      {balance >= selected.cost ? (
                        <Button className="w-full" onClick={confirmSend} disabled={sending}>
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
