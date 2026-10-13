import { useCallback, useEffect, useState } from "react"
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
 *                  IS the phone number. So a code is texted to it and the account is not
 *                  payable until that code comes back. Two steps, necessarily.
 *
 * The four states an account can be in mean different things and call for different
 * actions, so none of them is collapsed into another:
 *
 *   verified       payable.
 *   rejected       it resolved to somebody else. The bank's version is shown, because that
 *                  is how a member spots which digit they got wrong.
 *   pending        nobody could reach the bank. Not a failed check, and must not read as one.
 *   awaiting_code  waiting on the member, not on us. It needs a code, not a retry.
 */

type Props = {
  selectedId: string | null
  /** The whole account, because the confirmation screen has to name it. */
  onSelect: (account: CowryPayoutAccount) => void
}

const RAIL_LABEL: Record<string, string> = {
  ng_bank: "Bank account",
  mobile_money: "Mobile money",
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
  if (account.status === "awaiting_code") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf2ff] px-2 py-0.5 text-[11px] font-semibold text-[#2b6cb0]">
        Needs your code
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

export function PayoutAccountPicker({ selectedId, onSelect }: Props) {
  const [accounts, setAccounts] = useState<CowryPayoutAccount[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)

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

  /** The account waiting on a texted code, and the code being typed into it. */
  const [confirming, setConfirming] = useState<CowryPayoutAccount | null>(null)
  const [code, setCode] = useState("")

  const network = networks.find((item) => item.key === networkKey) ?? null

  const load = useCallback(async () => {
    setFailed(false)
    try {
      const next = await listPayoutAccounts()
      setAccounts(next)
      // Pick for them when there is nothing to choose: a member with one verified account
      // should never have to tap it.
      const verified = next.filter((account) => account.status === "verified")
      if (!selectedId && verified.length > 0) {
        onSelect(verified.find((account) => account.isDefault) ?? verified[0])
      }
    } catch {
      setFailed(true)
    }
  }, [onSelect, selectedId])

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

      if (result.reason === "account_awaiting_code" && result.account) {
        // Not a failure. The code is already on its way, so the form becomes the place
        // to type it rather than closing and leaving the member to find it again.
        setAdding(false)
        setLocalNumber("")
        setConfirming(result.account)
        setCode("")
        await load()
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

  async function submitCode() {
    if (!confirming) return
    setBusy(true)
    try {
      const result = await confirmPayoutAccount(confirming.id, code)

      if (result.ok) {
        toast.success("Number confirmed.")
        setConfirming(null)
        setCode("")
        await load()
        if (result.account) onSelect(result.account)
        return
      }

      if (result.reason === "sms_code_wrong") {
        // Survivable. The provider allows a few tries, so the field stays open.
        toast.error("That code didn't match. Try again.")
        setCode("")
        return
      }
      // Burnt, expired, or gone. The account went with it, so there is nothing to retry
      // in place — they add the number again and get a fresh code.
      toast.error("That code has expired. Add the number again to get a new one.")
      setConfirming(null)
      setCode("")
      await load()
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function remove(account: CowryPayoutAccount) {
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
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#141922]">
          <Building2 className="size-4 text-[#657080]" aria-hidden="true" />
          Where should it go?
        </h2>
        <Button variant="outline" size="sm" onClick={() => setAdding(true)} disabled={busy}>
          <Plus className="mr-1.5 size-4" aria-hidden="true" />
          Add
        </Button>
      </div>

      {failed ? (
        <div className="rounded-2xl border border-dashed border-[#d7dde3] p-5 text-center">
          <p className="text-sm text-[#657080]">We couldn&apos;t load your accounts.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : accounts === null ? (
        <div className="space-y-2">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d7dde3] p-6 text-center">
          <p className="text-sm font-semibold text-[#4f5862]">No account yet</p>
          <p className="mt-1 text-sm text-[#8b95a1]">
            Add the account you want your money paid into. We check it before saving it.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {accounts.map((account) => {
            const payable = account.status === "verified"
            const chosen = payable && selectedId === account.id
            return (
              <li key={account.id}>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-3 transition",
                    chosen ? "border-[#00b4b8] bg-[#effbfb]" : "border-[#e2e6ea]",
                    !payable && "opacity-80",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => payable && onSelect(account)}
                    disabled={!payable}
                    className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
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

                  {account.status === "awaiting_code" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={busy}
                      onClick={() => {
                        setConfirming(account)
                        setCode("")
                      }}
                    >
                      Enter code
                    </Button>
                  )}

                  {chosen && <Check className="size-4 shrink-0 text-[#00868a]" aria-hidden="true" />}

                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove account ending ${account.masked}`}
                    disabled={busy}
                    onClick={() => void remove(account)}
                  >
                    <Trash2 className="size-4 text-[#b4372c]" aria-hidden="true" />
                  </Button>
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
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a payout account</DialogTitle>
            <DialogDescription>
              We check it before saving. It has to be yours.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={rail === "ng_bank"}
              onClick={() => setRail("ng_bank")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                rail === "ng_bank"
                  ? "border-[#00b4b8] bg-[#effbfb] text-[#00868a]"
                  : "border-[#e2e6ea] text-[#657080]",
              )}
            >
              <Building2 className="size-4" aria-hidden="true" />
              Bank
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={rail === "mobile_money"}
              disabled={!momoAvailable}
              onClick={() => setRail("mobile_money")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                rail === "mobile_money"
                  ? "border-[#00b4b8] bg-[#effbfb] text-[#00868a]"
                  : "border-[#e2e6ea] text-[#657080]",
                !momoAvailable && "cursor-not-allowed opacity-50",
              )}
            >
              <Smartphone className="size-4" aria-hidden="true" />
              Mobile money
            </button>
          </div>

          {!momoAvailable && rail === "ng_bank" && (
            <p className="-mt-1 text-xs text-[#8a94a3]">
              Mobile money isn&apos;t available yet.
            </p>
          )}

          {rail === "ng_bank" ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="payout-bank">Bank</Label>
                <Select value={bankCode} onValueChange={setBankCode}>
                  <SelectTrigger id="payout-bank" className="mt-2">
                    <SelectValue placeholder={banks.length ? "Choose your bank" : "Loading banks…"} />
                  </SelectTrigger>
                  <SelectContent>
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
                <Input
                  id="payout-account"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="0123456789"
                  className={cn("mt-2 tabular-nums tracking-wider", ready && "border-[#1f9c4c]")}
                  value={accountNumber}
                  onChange={(event) => {
                    setAccountNumber(event.target.value.replace(/\D/g, ""))
                    setMismatch(null)
                  }}
                />
                <p className="mt-1.5 text-xs text-[#8a94a3]">{accountNumber.length}/10 digits</p>
              </div>

              <p className="rounded-xl bg-[#f7f9fb] px-3 py-2 text-xs text-[#657080]">
                We don&apos;t ask for the account name — your bank tells us, and that is what we
                check against your profile.
              </p>

              {mismatch && (
                <div className="rounded-xl bg-[#fdecea] px-3 py-2.5 text-sm text-[#b4372c]">
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
                  <SelectContent>
                    {networks.map((item) => (
                      <SelectItem key={item.key} value={item.key}>
                        {item.label} · {item.currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="payout-msisdn">Mobile money number</Label>
                <div className="mt-2 flex items-center gap-2">
                  <span className="rounded-xl bg-[#f0f3f6] px-3 py-2.5 text-sm font-semibold tabular-nums text-[#4f5862]">
                    +{network?.dialCode ?? "—"}
                  </span>
                  <Input
                    id="payout-msisdn"
                    inputMode="numeric"
                    placeholder="201234567"
                    disabled={!network}
                    className="tabular-nums tracking-wider"
                    value={localNumber}
                    onChange={(event) => setLocalNumber(event.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </div>

              {network && (
                <p className="rounded-xl bg-[#f7f9fb] px-3 py-2 text-xs text-[#657080]">
                  We&apos;ll text a code to this number. Being able to receive it is what proves
                  the wallet is yours — there&apos;s no bank to ask on this one. You&apos;ll be
                  paid in <span className="font-semibold">{network.currency}</span>.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={!ready || busy}>
              {busy && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
              {busy ? "Checking…" : rail === "ng_bank" ? "Check and save" : "Text me a code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── the texted code ────────────────────────────────────────────────── */}

      <Dialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirming(null)
            setCode("")
          }
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm your number</DialogTitle>
            <DialogDescription>
              We texted a code to{" "}
              <span className="font-semibold text-[#141922]">{confirming?.masked}</span>. Enter it
              to finish adding this wallet.
            </DialogDescription>
          </DialogHeader>

          <Label htmlFor="momo-code" className="sr-only">
            Confirmation code
          </Label>
          <Input
            id="momo-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={10}
            placeholder="000000"
            className="h-14 text-center text-2xl font-bold tracking-[0.35em] tabular-nums"
            value={code}
            // Never trimmed to a number: a leading zero is part of the code, and 012345
            // read as a number is a different, shorter one.
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 10))}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void submitCode()} disabled={code.length < 4 || busy}>
              {busy && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
