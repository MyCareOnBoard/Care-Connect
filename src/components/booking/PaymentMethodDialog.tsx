import { useState } from "react"
import { CreditCard } from "lucide-react"
import paypalIcon from "@/assets/imgs/PayPal Icon.png"
import applePayIcon from "@/assets/imgs/Apple Pay Icon.png"
import googlePayIcon from "@/assets/imgs/Google Pay Icon.png"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

/**
 * Payment method picker — extracted from telehealth.tsx so the follow-up accept
 * flow reuses the same surface instead of duplicating it.
 *
 * Record-only, deliberately: this picks a display LABEL which is stored on the
 * booking as `paymentMethod`. Nothing is charged anywhere in Care Connect, and
 * the backend only ever moves `paymentStatus` between "pending" and
 * "not_collected". Do not add a real payment affordance here without the
 * server-side capture to match it.
 */

export type PaymentOption = { id: string; label: string; iconBg: string; icon?: typeof CreditCard; image?: string }

export const PAYMENT_METHODS: { group: string; options: PaymentOption[] }[] = [
  {
    group: "Bank payment",
    options: [{ id: "card", label: "Debit/credit card", icon: CreditCard, iconBg: "bg-[#eef1f3] text-[#151922]" }],
  },
  {
    group: "Mobile payment",
    options: [
      { id: "paypal", label: "Paypal", image: paypalIcon, iconBg: "bg-white border border-[#e2e2e2]" },
      { id: "apple-pay", label: "Apple Pay", image: applePayIcon, iconBg: "bg-white border border-[#e2e2e2]" },
      { id: "google-pay", label: "Google pay", image: googlePayIcon, iconBg: "bg-white border border-[#e2e2e2]" },
    ],
  },
]

export function PaymentMethodDialog({
  open,
  onOpenChange,
  selected,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selected: string | null
  onSelect: (label: string) => void
}) {
  const [localSelected, setLocalSelected] = useState<string | null>(selected)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setLocalSelected(selected)
        onOpenChange(next)
      }}
    >
      <DialogContent showCloseButton className="p-0 max-w-130">
        <DialogHeader className="px-6 pt-6 text-left">
          <DialogTitle className="text-xl font-semibold text-[#151922]">Select payment method</DialogTitle>
        </DialogHeader>
        <DialogBody className="px-6 pt-4 pb-6 space-y-6">
          {PAYMENT_METHODS.map((group) => (
            <div key={group.group} className="space-y-3">
              <p className="text-sm font-semibold text-[#151922]">{group.group}</p>
              <div className="space-y-2">
                {group.options.map((option) => (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-[#eef1f3] px-4 py-3 hover:bg-[#f8fbff]"
                  >
                    <span className="flex items-center gap-3">
                      <span className={`flex size-9 items-center justify-center overflow-hidden rounded-full ${option.iconBg}`}>
                        {option.icon ? <option.icon className="size-4" /> : <img src={option.image} alt="" loading="lazy" decoding="async" className="size-10 object-contain" />}
                      </span>
                      <span className="text-sm font-medium text-[#151922]">{option.label}</span>
                    </span>
                    <span className="flex size-5 items-center justify-center rounded-full border-2 border-[#00b4b8]">
                      {localSelected === option.label && <span className="size-2.5 rounded-full bg-[#00b4b8]" />}
                    </span>
                    <input
                      type="radio"
                      className="sr-only"
                      checked={localSelected === option.label}
                      onChange={() => setLocalSelected(option.label)}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
          <Button
            className="w-full bg-[#00b4b8] text-white hover:opacity-90"
            disabled={!localSelected}
            onClick={() => {
              if (!localSelected) return
              onSelect(localSelected)
              onOpenChange(false)
            }}
          >
            Select payment method
          </Button>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
