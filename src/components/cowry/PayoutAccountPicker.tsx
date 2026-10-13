import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Building2, Check, Loader2, Plus, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react"
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
  listPayoutAccounts,
  listPayoutBanks,
  removePayoutAccount,
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
 * The screen is honest about the three states an account can be in, because they mean
 * different things and call for different actions:
 *
 *   verified   the bank's own record matched the member's name. Payable.
 *   rejected   it resolved to somebody else. The bank's version is shown, because that is
 *              how a member spots which digit they got wrong.
 *   pending    nobody could reach the bank. Not a failed check, and must not read as one.
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

  const [banks, setBanks] = useState<{ code: string; name: string }[]>([])
  const [bankCode, setBankCode] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  /** What the bank said when a save was refused — shown so a typo is findable. */
  const [mismatch, setMismatch] = useState<string | null>(null)

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
    if (!adding || banks.length > 0) return
    // Loaded when the form opens rather than with the page: most visits pick a saved
    // account and never need the list.
    listPayoutBanks()
      .then(setBanks)
      .catch(() => setBanks([]))
  }, [adding, banks.length])

  async function save() {
    setBusy(true)
    setMismatch(null)
    try {
      const result = await addPayoutAccount({ rail: "ng_bank", accountNumber, bankCode })

      if (result.ok) {
        toast.success("Account verified and saved.")
        setAdding(false)
        setAccountNumber("")
        setBankCode("")
        await load()
        if (result.account) onSelect(result.account)
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
      toast.error("We couldn't save that account.")
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

  const ready = /^\d{10}$/.test(accountNumber) && Boolean(bankCode)

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
            Add the account you want your money paid into. We check it with your bank before
            saving it.
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
                      {account.bankName ?? account.network ?? RAIL_LABEL[account.rail]} ·{" "}
                      <span className="tabular-nums">{account.masked}</span>
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
              We check it with your bank before saving. It has to be in your own name.
            </DialogDescription>
          </DialogHeader>

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
                  <span className="font-semibold">{mismatch}</span>. Check the number — we can only
                  pay an account in your own name.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={!ready || busy}>
              {busy && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
              {busy ? "Checking…" : "Check and save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
