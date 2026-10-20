import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  Building2,
  Check,
  Loader2,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { getAuthErrorMessage } from "@/utils/auth"
import { EmptyState } from "@/components/ui/empty-state"
import { NetworkLogo } from "@/components/cowry/NetworkLogo"
import {
  clearRecaptchaVerifier,
  startPhoneLink,
  type PhoneLinkRefusal,
} from "@/utils/auth/services/phoneLinkService"
import {
  addPayoutAccount,
  confirmPayoutAccount,
  listPayoutAccounts,
  listPayoutBanks,
  listPayoutNetworks,
  removePayoutAccount,
  type CowryMomoNetwork,
  type CowryPayoutAccount,
} from "@/utils/careconnect/services/cowryService"

/**
 * Choosing where a withdrawal goes.
 *
 * Accounts are saved and checked once, rather than typed per withdrawal, and that ordering
 * is the point. Re-typing ten digits against a thirty-minute reservation timer is how
 * people mistype them, and a mistyped account that passes the bank's checksum pays a
 * stranger with no way back.
 *
 * The two rails prove ownership differently, and the screen does not pretend otherwise:
 *
 *   bank account   the provider resolves the number to the name the bank holds, and that
 *                  must match the member. One step, and it either passes or it does not.
 *
 *   mobile money   there is no name to resolve anywhere in the region, because the account
 *                  IS the phone number. So the number is linked to the member's Firebase
 *                  account — Firebase sends the SMS, counts the attempts and expires the
 *                  code — and the server then reads it back off the auth record. Two steps,
 *                  necessarily, and the code never passes through us.
 *
 * The four states an account can be in mean different things and call for different
 * actions, so none of them is collapsed into another:
 *
 *   verified       payable.
 *   rejected       it resolved to somebody else. The bank's version is shown, because that
 *                  is how a member spots which digit they got wrong.
 *   pending        nobody could reach the bank. Not a failed check, and must not read as one.
 *   awaiting_verification
 *                  waiting on the member, not on us. It needs confirming, not a retry.
 */

type Props = {
  selectedId?: string | null
  /** The whole account, because the confirmation screen has to name it. */
  onSelect?: (account: CowryPayoutAccount) => void
  /**
   * Manage rather than choose: the wallet's "Payout accounts" card, where accounts are
   * added, confirmed and removed ahead of a cash-out, and nothing is being picked.
   */
  manage?: boolean
}

const RAIL_LABEL: Record<string, string> = {
  ng_bank: "Bank account",
  mobile_money: "Mobile money",
}

/** Where the invisible reCAPTCHA Firebase needs for an SMS gets mounted. */
const RECAPTCHA_CONTAINER_ID = "payout-phone-recaptcha"

type LinkConfirmResult = { ok: true } | { ok: false; reason: PhoneLinkRefusal }

/**
 * What a member is told when Firebase refuses.
 *
 * Firebase's own codes name a mechanism rather than a situation, and the two that matter
 * most here — one number per account, and a number already proven elsewhere — are states a
 * member can act on only if they are described in those terms.
 */
const LINK_MESSAGE: Record<PhoneLinkRefusal, string> = {
  phone_already_set:
    "Your account already has a different number confirmed, and only one can be. Remove that wallet first, or use that number.",
  phone_taken: "That number is already confirmed on another Care Connect account.",
  wrong_code: "That code didn't match. Try again.",
  code_expired: "That code has expired. Close this and add the number again for a fresh one.",
  send_failed: "We couldn't text a code to that number. Check it and try again.",
  not_signed_in: "Please sign in again.",
}

function StatusBadge({ account }: { account: CowryPayoutAccount }) {
  if (account.status === "verified") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f7ee] px-2 py-0.5 text-[11px] font-semibold text-[#1f9c4c]">
        <ShieldCheck className="size-3" aria-hidden="true" />
        Verified
      </span>
    )
  }
  if (account.status === "awaiting_verification") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf2ff] px-2 py-0.5 text-[11px] font-semibold text-[#2b6cb0]">
        Needs confirming
      </span>
    )
  }
  if (account.status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#fff4df] px-2 py-0.5 text-[11px] font-semibold text-[#a8793f]">
        Not checked yet
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#fdecea] px-2 py-0.5 text-[11px] font-semibold text-[#b4372c]">
      <ShieldAlert className="size-3" aria-hidden="true" />
      Not your account
    </span>
  )
}

export function PayoutAccountPicker({ selectedId = null, onSelect: onSelectProp, manage = false }: Props) {
  // A stable no-op when nothing is choosing, so `load` is not rebuilt on every render.
  const noop = useCallback(() => undefined, [])
  const onSelect = onSelectProp ?? noop
  const [accounts, setAccounts] = useState<CowryPayoutAccount[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  /** The account whose bin was tapped once. Removing takes a second tap, on "Remove". */
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  const [rail, setRail] = useState<"ng_bank" | "mobile_money">("ng_bank")

  const [banks, setBanks] = useState<{ code: string; name: string }[]>([])
  const [bankCode, setBankCode] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  /** What the bank said when a save was refused — shown so a typo is findable. */
  const [mismatch, setMismatch] = useState<string | null>(null)

  const [networks, setNetworks] = useState<CowryMomoNetwork[]>([])
  const [momoAvailable, setMomoAvailable] = useState(false)
  const [networkKey, setNetworkKey] = useState("")
  const [localNumber, setLocalNumber] = useState("")

  /** The wallet being confirmed, the code being typed, and the live Firebase link. */
  const [confirming, setConfirming] = useState<CowryPayoutAccount | null>(null)
  const [code, setCode] = useState("")
  const [sending, setSending] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  // Held rather than stored in state as a value, because it is a one-shot closure over a
  // Firebase verification and re-rendering must not replace it with a stale one.
  const confirmStep = useRef<((code: string) => Promise<LinkConfirmResult>) | null>(null)

  const network = networks.find((item) => item.key === networkKey) ?? null

  const load = useCallback(async () => {
    setFailed(false)
    try {
      const next = await listPayoutAccounts()
      setAccounts(next)
      // Pick for them when there is nothing to choose: a member with one verified account
      // should never have to tap it.
      const verified = next.filter((account) => account.status === "verified")
      if (!manage && !selectedId && verified.length > 0) {
        onSelect(verified.find((account) => account.isDefault) ?? verified[0])
      }
    } catch {
      setFailed(true)
    }
  }, [manage, onSelect, selectedId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!adding) return
    // Loaded when the form opens rather than with the page: most visits pick a saved
    // account and never need either list.
    if (banks.length === 0) {
      listPayoutBanks()
        .then(setBanks)
        .catch(() => setBanks([]))
    }
    if (networks.length === 0) {
      listPayoutNetworks()
        .then(({ available, networks: list }) => {
          setMomoAvailable(available)
          setNetworks(list)
        })
        .catch(() => setMomoAvailable(false))
    }
  }, [adding, banks.length, networks.length])

  /** The number in the form the server stores, built from the network's own country code. */
  function composedMsisdn() {
    if (!network) return ""
    // A leading zero is how the number is written locally and is not part of the
    // international form. Dropping it here saves a refusal the member cannot interpret.
    return `+${network.dialCode}${localNumber.replace(/^0+/, "")}`
  }

  async function save() {
    setBusy(true)
    setMismatch(null)
    try {
      const result =
        rail === "ng_bank"
          ? await addPayoutAccount({ rail: "ng_bank", accountNumber, bankCode })
          : await addPayoutAccount({
              rail: "mobile_money",
              msisdn: composedMsisdn(),
              network: networkKey,
            })

      if (result.ok) {
        toast.success("Account verified and saved.")
        setAdding(false)
        setAccountNumber("")
        setBankCode("")
        await load()
        if (result.account) onSelect(result.account)
        return
      }

      if (result.reason === "account_awaiting_verification" && result.account) {
        // Not a failure — the wallet is saved and only needs proving. Moving straight
        // into the code step keeps it one continuous action rather than closing the form
        // and leaving the member to find their way back to it.
        setAdding(false)
        setLocalNumber("")
        await load()
        await beginConfirm(result.account)
        return
      }

      if (result.reason === "account_phone_already_set") {
        toast.error(result.message ?? LINK_MESSAGE.phone_already_set)
        setAdding(false)
        return
      }

      if (result.reason === "account_name_mismatch") {
        // Kept open with the bank's version on screen. Closing the form here would hide
        // the one piece of information that lets them find the wrong digit.
        setMismatch(result.resolvedName ?? null)
        return
      }
      if (result.reason === "account_resolve_failed") {
        toast.error(result.message ?? "We couldn't reach your bank to check that account.")
        return
      }
      if (result.reason === "account_already_saved") {
        toast.error("That account is already saved.")
        setAdding(false)
        return
      }
      if (result.reason === "momo_number_country_mismatch") {
        toast.error(result.message ?? "That number isn't from the right country for this network.")
        return
      }
      if (result.reason === "rail_unavailable") {
        toast.error(result.message ?? "Mobile money isn't available yet.")
        return
      }
      if (result.reason === "sms_verification_send_failed") {
        toast.error("We couldn't text a code to that number. Check it and try again.")
        return
      }
      toast.error("We couldn't save that account.")
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  /**
   * Open the code dialog and ask Firebase to text the number.
   *
   * Firebase sends the SMS, counts the attempts and expires the code; none of that is ours
   * and none of it passes through our server. The dialog opens before the request so the
   * reCAPTCHA has somewhere to mount and the member can see something is happening.
   */
  async function beginConfirm(target: CowryPayoutAccount) {
    setConfirming(target)
    setCode("")
    setLinkError(null)
    confirmStep.current = null

    if (!target.msisdn) {
      setLinkError(LINK_MESSAGE.send_failed)
      return
    }

    setSending(true)
    try {
      const started = await startPhoneLink(target.msisdn, RECAPTCHA_CONTAINER_ID)
      if (!started.ok) {
        setLinkError(
          started.reason === "phone_already_set" && started.message
            ? `Your account already has ${started.message} confirmed, and only one number can be.`
            : LINK_MESSAGE[started.reason],
        )
        return
      }
      confirmStep.current = started.confirm
    } catch (error) {
      setLinkError(getAuthErrorMessage(error))
    } finally {
      setSending(false)
    }
  }

  /**
   * Answer the SMS, then ask our server to look.
   *
   * Two steps because they prove different things. The first is between the member and
   * Firebase and is what actually establishes anything; the second is our server reading
   * the result off the auth record. Doing only the first would leave the wallet unusable;
   * doing only the second would be taking the client's word for it.
   */
  async function submitCode() {
    if (!confirming || !confirmStep.current) return
    setBusy(true)
    setLinkError(null)
    try {
      const linked = await confirmStep.current(code)
      if (!linked.ok) {
        setLinkError(LINK_MESSAGE[linked.reason])
        setCode("")
        // An expired code cannot be retried in place; the member needs a fresh send.
        if (linked.reason === "code_expired") confirmStep.current = null
        return
      }

      const result = await confirmPayoutAccount(confirming.id)
      if (result.ok) {
        toast.success("Number confirmed.")
        setConfirming(null)
        setCode("")
        await load()
        if (result.account) onSelect(result.account)
        return
      }

      // Firebase accepted the code but our server cannot see the number against the
      // account. Rare, and not something a member can fix by typing again.
      setLinkError("We couldn't confirm that number. Try adding it again.")
    } catch (error) {
      setLinkError(getAuthErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function remove(account: CowryPayoutAccount) {
    setConfirmRemove(null)
    setBusy(true)
    try {
      await removePayoutAccount(account.id)
      await load()
      toast.success("Account removed.")
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const ready =
    rail === "ng_bank"
      ? /^\d{10}$/.test(accountNumber) && Boolean(bankCode)
      : Boolean(network) && localNumber.replace(/^0+/, "").length >= 7

  return (
    <section className="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-[#e2e6ea] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#141922]">
            <Building2 className="size-4 text-[#657080]" aria-hidden="true" />
            {manage ? "Payout accounts" : "Where should it go?"}
          </h2>
          {manage && (
            <p className="mt-0.5 text-xs text-[#657080]">
              Where your cash-outs are paid. Add and check one now, and cashing out is one step.
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => setAdding(true)} disabled={busy}>
          <Plus className="size-4" aria-hidden="true" />
          Add account
        </Button>
      </div>

      {failed ? (
        <EmptyState
          className="py-6"
          title="We couldn't load your accounts"
          action={
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => void load()}>
              Try again
            </Button>
          }
        />
      ) : accounts === null ? (
        <div className="space-y-2">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState className="py-6" title="No account yet">
          Add the account you want your money paid into. We check it before saving it.
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {accounts.map((account) => {
            const payable = account.status === "verified"
            const chosen = !manage && payable && selectedId === account.id
            return (
              <li key={account.id}>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-3 transition",
                    chosen ? "border-[#00b4b8] bg-[#effbfb]" : "border-[#e2e6ea]",
                    !payable && "opacity-80",
                  )}
                >
                  {/* Which kind of account at a glance: a bank, or a mobile wallet. */}
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl",
                      account.rail === "mobile_money" ? "bg-[#fff4df] text-[#c8963e]" : "bg-[#e6f8f8] text-[#00868a]",
                    )}
                    aria-hidden="true"
                  >
                    {account.rail === "mobile_money" ? <Smartphone className="size-5" /> : <Building2 className="size-5" />}
                  </span>
                  <button
                    type="button"
                    onClick={() => payable && onSelect(account)}
                    disabled={!payable || manage}
                    className={cn("min-w-0 flex-1 text-left", !manage && "disabled:cursor-not-allowed", manage && "cursor-default")}
                  >
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#141922]">
                      {account.resolvedName ?? account.label ?? RAIL_LABEL[account.rail]}
                      <StatusBadge account={account} />
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[#8b95a1]">
                      {account.bankName ?? account.networkLabel ?? RAIL_LABEL[account.rail]} ·{" "}
                      <span className="tabular-nums">{account.masked}</span>
                      {account.currency && account.currency !== "NGN" && (
                        <> · paid in {account.currency}</>
                      )}
                    </p>
                    {account.status === "rejected" && (
                      <p className="mt-1 text-xs text-[#b4372c]">
                        Your bank says this account belongs to someone else. Remove it and check
                        the number.
                      </p>
                    )}
                    {account.status === "pending" && (
                      <p className="mt-1 text-xs text-[#a8793f]">
                        We couldn&apos;t reach your bank to check this one. Remove it and try again.
                      </p>
                    )}
                  </button>

                  {account.status === "awaiting_verification" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={busy}
                      onClick={() => void beginConfirm(account)}
                    >
                      Confirm
                    </Button>
                  )}

                  {chosen && <Check className="size-4 shrink-0 text-[#00868a]" aria-hidden="true" />}

                  {/* Two taps: one on the bin, one on "Remove". A saved account is a checked
                      account, and one stray tap should not undo that. */}
                  {confirmRemove === account.id ? (
                    <Button
                      size="sm"
                      autoFocus
                      className="animate-fadeIn shrink-0 bg-[#b4372c] text-white hover:bg-[#8f2a22]"
                      disabled={busy}
                      onClick={() => void remove(account)}
                      onBlur={() => !busy && setConfirmRemove(null)}
                    >
                      Remove
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      aria-label={`Remove account ending ${account.masked}`}
                      disabled={busy}
                      onClick={() => setConfirmRemove(account.id)}
                    >
                      <Trash2 className="size-4 text-[#b4372c]" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* ── adding one ─────────────────────────────────────────────────────── */}

      <Dialog
        open={adding}
        onOpenChange={(open) => {
          if (!open) {
            setAdding(false)
            setMismatch(null)
          }
        }}
      >
        {/* A column: the title and the buttons stay put and only the form scrolls, so the
            buttons are always in reach on a phone with the keyboard up. */}
        <DialogContent showCloseButton className="flex max-h-[min(92vh,720px)] flex-col overflow-hidden sm:max-w-md">
          <DialogHeader className="shrink-0 border-b border-[#eef1f3] pb-4 pr-16">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#e6f8f8] text-[#00868a]" aria-hidden="true">
                {rail === "mobile_money" ? <Smartphone className="size-5" /> : <Building2 className="size-5" />}
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold text-[#141922]">Add a payout account</DialogTitle>
                <DialogDescription className="mt-0.5 text-sm text-[#657080]">
                  We check it before saving. It has to be yours.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {/* Where the money goes: two cards, each saying what it is. */}
            <div className="grid grid-cols-2 gap-3" role="tablist" aria-label="Account type">
              <button
                type="button"
                role="tab"
                aria-selected={rail === "ng_bank"}
                onClick={() => setRail("ng_bank")}
                className={cn(
                  "cowry-press flex flex-col items-start gap-1.5 rounded-2xl border-2 p-3 text-left transition",
                  rail === "ng_bank" ? "border-[#00b4b8] bg-[#effbfb]" : "border-[#e2e6ea] hover:border-[#c8cdd4]",
                )}
              >
                <span className={cn("flex size-9 items-center justify-center rounded-xl", rail === "ng_bank" ? "bg-[#00b4b8] text-white" : "bg-[#eef1f3] text-[#657080]")}>
                  <Building2 className="size-4.5" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-[#141922]">Bank account</span>
                <span className="text-xs leading-snug text-[#657080]">Checked with your bank</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={rail === "mobile_money"}
                disabled={!momoAvailable}
                onClick={() => setRail("mobile_money")}
                className={cn(
                  "cowry-press flex flex-col items-start gap-1.5 rounded-2xl border-2 p-3 text-left transition",
                  rail === "mobile_money" ? "border-[#00b4b8] bg-[#effbfb]" : "border-[#e2e6ea] hover:border-[#c8cdd4]",
                  !momoAvailable && "cursor-not-allowed opacity-55 hover:border-[#e2e6ea]",
                )}
              >
                <span className={cn("flex size-9 items-center justify-center rounded-xl", rail === "mobile_money" ? "bg-[#00b4b8] text-white" : "bg-[#eef1f3] text-[#657080]")}>
                  <Smartphone className="size-4.5" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-[#141922]">Mobile money</span>
                <span className="text-xs leading-snug text-[#657080]">
                  {momoAvailable ? "Confirmed by a text" : "Isn't available yet"}
                </span>
              </button>
            </div>

            {rail === "ng_bank" ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="payout-bank">Bank</Label>
                  <Select value={bankCode} onValueChange={setBankCode}>
                    <SelectTrigger id="payout-bank" className="mt-2">
                      <SelectValue placeholder={banks.length ? "Choose your bank" : "Loading banks…"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {banks.map((bank) => (
                        <SelectItem key={bank.code} value={bank.code}>
                          {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="payout-account">Account number</Label>
                  <div className="relative mt-2">
                    <Input
                      id="payout-account"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="0123456789"
                      className={cn("pr-10 tabular-nums tracking-wider", accountNumber.length === 10 && "border-[#1f9c4c]")}
                      value={accountNumber}
                      onChange={(event) => {
                        setAccountNumber(event.target.value.replace(/\D/g, ""))
                        setMismatch(null)
                      }}
                    />
                    {accountNumber.length === 10 && (
                      <Check className="animate-fadeIn absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#1f9c4c]" aria-hidden="true" />
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-[#8a94a3]">{accountNumber.length}/10 digits</p>
                </div>

                <p className="flex gap-2 rounded-xl bg-[#f7f9fb] px-3 py-2.5 text-xs leading-relaxed text-[#657080]">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#00868a]" aria-hidden="true" />
                  <span>
                    We don&apos;t ask for the account name — your bank tells us, and that is what we
                    check against your profile.
                  </span>
                </p>

                {mismatch && (
                  <div className="animate-fadeIn rounded-xl bg-[#fdecea] px-3 py-2.5 text-sm text-[#b4372c]">
                    <p className="font-semibold">That account isn&apos;t in your name</p>
                    <p className="mt-1">
                      Your bank says it belongs to{" "}
                      <span className="font-semibold">{mismatch}</span>. Check the number — we can
                      only pay an account in your own name.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="payout-network">Network</Label>
                  <Select value={networkKey} onValueChange={setNetworkKey}>
                    <SelectTrigger id="payout-network" className="mt-2">
                      <SelectValue placeholder="Choose your network" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {networks.map((item) => (
                        <SelectItem key={item.key} value={item.key}>
                          <span className="inline-flex items-center gap-2">
                            <NetworkLogo network={item.key} label={item.label} size={22} />
                            {item.label} · {item.currency}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="payout-msisdn">Mobile money number</Label>
                  {/* The country code and the number as one field, the way a number is read. */}
                  <div
                    className={cn(
                      "mt-2 flex items-stretch overflow-hidden rounded-xl border border-[#e2e6ea] bg-white transition focus-within:border-[#00b4b8] focus-within:ring-2 focus-within:ring-[#00b4b8]/20",
                      !network && "opacity-60",
                    )}
                  >
                    <span className="flex items-center border-r border-[#e2e6ea] bg-[#f4f6f8] px-3 text-sm font-semibold tabular-nums text-[#4f5862]">
                      +{network?.dialCode ?? "—"}
                    </span>
                    <input
                      id="payout-msisdn"
                      inputMode="numeric"
                      placeholder={network ? "201234567" : "Choose a network first"}
                      disabled={!network}
                      className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm tabular-nums tracking-wider outline-none disabled:cursor-not-allowed"
                      value={localNumber}
                      onChange={(event) => setLocalNumber(event.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                </div>

                {network && (
                  <div className="animate-fadeIn space-y-1.5 rounded-xl bg-[#f7f9fb] px-3 py-2.5 text-xs leading-relaxed text-[#657080]">
                    <p>
                      We&apos;ll text a code to this number. Being able to receive it is what proves
                      the wallet is yours — there&apos;s no bank to ask on this one.
                    </p>
                    <p>
                      You&apos;ll be paid in <span className="font-semibold text-[#141922]">{network.currency}</span>.
                      Only one number can be confirmed per account.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t border-[#eef1f3] pt-4">
            <Button variant="outline" className="rounded-full" onClick={() => setAdding(false)} disabled={busy}>
              Cancel
            </Button>
            <Button className="cowry-press rounded-full bg-[#00b4b8] px-6 text-white shadow-[0_8px_20px_-8px_rgba(0,180,184,0.75)] transition hover:-translate-y-0.5 hover:bg-[#00a3a7] hover:opacity-100 disabled:translate-y-0 disabled:bg-[#b8e3e4] disabled:shadow-none" onClick={() => void save()} disabled={!ready || busy}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {busy ? "Checking…" : rail === "ng_bank" ? "Check and save" : "Text me a code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── confirming the number with Firebase ────────────────────────────── */}

      <Dialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirming(null)
            setCode("")
            setLinkError(null)
            confirmStep.current = null
            // The verifier is single-use once it has fired. A stale one makes the next
            // attempt fail for a reason that has nothing to do with the number.
            clearRecaptchaVerifier()
          }
        }}
      >
        <DialogContent showCloseButton className="flex max-h-[min(92vh,560px)] flex-col overflow-hidden sm:max-w-sm">
          <DialogHeader className="shrink-0 pr-16">
            <span className="mb-1 flex size-11 items-center justify-center rounded-2xl bg-[#fff4df] text-[#c8963e]" aria-hidden="true">
              <Smartphone className="size-5" />
            </span>
            <DialogTitle className="text-lg font-semibold text-[#141922]">Confirm your number</DialogTitle>
            <DialogDescription className="text-sm text-[#657080]">
              {sending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Texting a code to {confirming?.msisdn ?? confirming?.masked}…
                </span>
              ) : (
                <>
                  Enter the code we texted to{" "}
                  <span className="font-semibold text-[#141922]">
                    {confirming?.msisdn ?? confirming?.masked}
                  </span>
                  . Being able to receive it is what proves the wallet is yours.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-5">
            {/* Firebase mounts its invisible reCAPTCHA here before it will send an SMS. */}
            <div id={RECAPTCHA_CONTAINER_ID} />

            <Label htmlFor="momo-code" className="sr-only">
              Confirmation code
            </Label>
            <Input
              id="momo-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              placeholder="000000"
              disabled={sending || confirmStep.current === null}
              className="h-14 text-center text-2xl font-bold tracking-[0.35em] tabular-nums"
              value={code}
              // Never trimmed to a number: a leading zero is part of the code, and 012345
              // read as a number is a different, shorter one.
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 10))}
            />

            {linkError && (
              <p className="animate-fadeIn rounded-xl bg-[#fdecea] px-3 py-2.5 text-sm text-[#b4372c]">
                {linkError}
              </p>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t border-[#eef1f3] pt-4">
            <Button variant="outline" className="rounded-full" onClick={() => setConfirming(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              className="cowry-press rounded-full bg-[#00b4b8] px-6 text-white shadow-[0_8px_20px_-8px_rgba(0,180,184,0.75)] transition hover:-translate-y-0.5 hover:bg-[#00a3a7] hover:opacity-100 disabled:translate-y-0 disabled:bg-[#b8e3e4] disabled:shadow-none"
              onClick={() => void submitCode()}
              disabled={code.length < 4 || busy || sending || confirmStep.current === null}
            >
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
