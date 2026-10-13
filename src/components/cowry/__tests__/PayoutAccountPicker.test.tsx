import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { PayoutAccountPicker } from "../PayoutAccountPicker"
import {
  addPayoutAccount,
  confirmPayoutAccount,
  listPayoutAccounts,
  listPayoutBanks,
  listPayoutNetworks,
  removePayoutAccount,
  type CowryPayoutAccount,
} from "@/utils/careconnect/services/cowryService"
import { startPhoneLink } from "@/utils/auth/services/phoneLinkService"

/**
 * Choosing where a withdrawal is paid.
 *
 * The cases kept here are the ones where getting it wrong costs a member money or locks
 * them out of their own, rather than the ones that merely look wrong.
 *
 * The shape worth understanding before reading them: on the mobile money rail the member
 * proves the number to **Firebase**, not to us. Firebase sends the SMS, counts the attempts
 * and expires the code; our server afterwards reads the number off the auth record. So the
 * screen has two steps that prove different things, and neither is sufficient alone —
 * answering the SMS without telling our server leaves the wallet unusable, and telling our
 * server without answering the SMS proves nothing at all.
 */

vi.mock("@/utils/careconnect/services/cowryService", async () => {
  const actual = await vi.importActual<
    typeof import("@/utils/careconnect/services/cowryService")
  >("@/utils/careconnect/services/cowryService")
  return {
    ...actual,
    listPayoutAccounts: vi.fn(),
    listPayoutBanks: vi.fn(),
    listPayoutNetworks: vi.fn(),
    addPayoutAccount: vi.fn(),
    confirmPayoutAccount: vi.fn(),
    removePayoutAccount: vi.fn(),
  }
})

vi.mock("@/utils/auth/services/phoneLinkService", () => ({
  startPhoneLink: vi.fn(),
  clearRecaptchaVerifier: vi.fn(),
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const account = (over: Partial<CowryPayoutAccount> = {}): CowryPayoutAccount => ({
  id: "a1",
  rail: "mobile_money",
  label: null,
  status: "awaiting_verification",
  resolvedName: "Ada Obi",
  bankCode: null,
  bankName: null,
  network: "mtn_gh",
  networkLabel: "MTN Mobile Money",
  msisdn: "+233201234567",
  currency: "GHS",
  masked: "••••4567",
  isDefault: true,
  rejectionReason: null,
  ...over,
})

const NETWORKS = [
  { key: "mtn_gh", label: "MTN Mobile Money", currency: "GHS", dialCode: "233" },
]

/** A Firebase link that accepts one code and refuses everything else. */
function linkAccepting(goodCode: string) {
  return vi.fn(async (code: string) =>
    code === goodCode ? { ok: true as const } : { ok: false as const, reason: "wrong_code" as const },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listPayoutAccounts).mockResolvedValue([])
  vi.mocked(listPayoutBanks).mockResolvedValue([{ code: "044", name: "Access Bank" }])
  vi.mocked(listPayoutNetworks).mockResolvedValue({ available: true, networks: NETWORKS })
  vi.mocked(removePayoutAccount).mockResolvedValue(undefined)
})

/** Walk the add form as far as submitting a mobile money number. */
async function addMomo(user: ReturnType<typeof userEvent.setup>, local = "0201234567") {
  await user.click(await screen.findByRole("button", { name: /add/i }))
  await waitFor(() => expect(listPayoutNetworks).toHaveBeenCalled())
  await user.click(screen.getByRole("tab", { name: /mobile money/i }))
  await user.click(screen.getByLabelText(/network/i))
  await user.click(await screen.findByRole("option", { name: /MTN Mobile Money/i }))
  await user.type(screen.getByLabelText(/mobile money number/i), local)
  await user.click(screen.getByRole("button", { name: /text me a code/i }))
}

describe("offering mobile money", () => {
  it("does not offer the rail when the server says it is off", async () => {
    // Firebase Phone Auth has to be enabled and the domain allow-listed before anyone can
    // finish. Offering it first would mean every attempt failing in the browser.
    vi.mocked(listPayoutNetworks).mockResolvedValue({ available: false, networks: [] })
    const user = userEvent.setup()
    render(<PayoutAccountPicker selectedId={null} onSelect={vi.fn()} />)

    await user.click(await screen.findByRole("button", { name: /add/i }))
    await waitFor(() => expect(listPayoutNetworks).toHaveBeenCalled())

    expect(screen.getByRole("tab", { name: /mobile money/i })).toBeDisabled()
    expect(screen.getByText(/isn't available yet/i)).toBeInTheDocument()
  })

  it("builds the international number from the network, not from the member", async () => {
    // A locally written number starts with a 0 that is not part of the international form.
    // Sending it through would be refused for a reason nobody could interpret.
    vi.mocked(addPayoutAccount).mockResolvedValue({
      ok: false,
      reason: "account_awaiting_verification",
      account: account(),
    })
    vi.mocked(startPhoneLink).mockResolvedValue({ ok: true, confirm: linkAccepting("123456") })
    const user = userEvent.setup()
    render(<PayoutAccountPicker selectedId={null} onSelect={vi.fn()} />)

    await addMomo(user)

    await waitFor(() =>
      expect(addPayoutAccount).toHaveBeenCalledWith({
        rail: "mobile_money",
        msisdn: "+233201234567",
        network: "mtn_gh",
      }),
    )
  })

  it("never sends a currency, because the member does not get to name it", async () => {
    // The payout refuses a currency it has no exchange rate for, so a client that could
    // name the currency could name that guard away.
    vi.mocked(addPayoutAccount).mockResolvedValue({
      ok: false,
      reason: "account_awaiting_verification",
      account: account(),
    })
    vi.mocked(startPhoneLink).mockResolvedValue({ ok: true, confirm: linkAccepting("123456") })
    const user = userEvent.setup()
    render(<PayoutAccountPicker selectedId={null} onSelect={vi.fn()} />)

    await addMomo(user)

    await waitFor(() => expect(addPayoutAccount).toHaveBeenCalled())
    expect(vi.mocked(addPayoutAccount).mock.calls[0][0]).not.toHaveProperty("currency")
  })

  it("says so when the account already has a different number confirmed", async () => {
    // Firebase holds one phone per account, and a member who hits that needs to be told
    // which number is in the way rather than that something went wrong.
    vi.mocked(addPayoutAccount).mockResolvedValue({
      ok: false,
      reason: "account_phone_already_set",
      message: "Your account already has +233209999999 confirmed, and only one number can be.",
    })
    const { toast } = await import("sonner")
    const user = userEvent.setup()
    render(<PayoutAccountPicker selectedId={null} onSelect={vi.fn()} />)

    await addMomo(user)

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("+233209999999")),
    )
  })
})

describe("confirming a mobile money number", () => {
  async function openConfirm(confirmImpl = linkAccepting("123456")) {
    vi.mocked(addPayoutAccount).mockResolvedValue({
      ok: false,
      reason: "account_awaiting_verification",
      account: account(),
    })
    vi.mocked(startPhoneLink).mockResolvedValue({ ok: true, confirm: confirmImpl })
    const user = userEvent.setup()
    render(<PayoutAccountPicker selectedId={null} onSelect={vi.fn()} />)
    await addMomo(user)
    await screen.findByText(/confirm your number/i)
    return user
  }

  it("asks Firebase to text the number in full, not the masked one", async () => {
    // A masked number cannot be linked, and linking is what the whole rail rests on.
    await openConfirm()
    await waitFor(() =>
      expect(startPhoneLink).toHaveBeenCalledWith("+233201234567", expect.any(String)),
    )
  })

  it("does not report the wallet as saved before it is proved", async () => {
    // The account exists, but nothing has shown the member holds the number. Treating
    // this as success is the state this rail must never reach.
    const user = await openConfirm()
    expect(screen.getByLabelText(/confirmation code/i)).toBeInTheDocument()
    expect(confirmPayoutAccount).not.toHaveBeenCalled()
    expect(user).toBeTruthy()
  })

  it("keeps the field open on a wrong code, so one bad digit is survivable", async () => {
    const user = await openConfirm()

    await user.type(screen.getByLabelText(/confirmation code/i), "000000")
    await user.click(screen.getByRole("button", { name: /^confirm$/i }))

    expect(await screen.findByText(/didn't match/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirmation code/i)).toBeInTheDocument()
    // And our server was never asked, because nothing was proved.
    expect(confirmPayoutAccount).not.toHaveBeenCalled()
  })

  it("tells the server only after Firebase has accepted the code", async () => {
    /*
     * The ordering the design rests on. Our server reads the number off the auth record,
     * so asking it before the link is answered would be asking a question whose answer is
     * always no — and asking it without the link at all would be taking the client's word.
     */
    const verified = account({ status: "verified" })
    vi.mocked(confirmPayoutAccount).mockResolvedValue({ ok: true, account: verified })
    const user = await openConfirm()

    await user.type(screen.getByLabelText(/confirmation code/i), "123456")
    await user.click(screen.getByRole("button", { name: /^confirm$/i }))

    await waitFor(() => expect(confirmPayoutAccount).toHaveBeenCalledWith("a1"))
    // No code travels to our server, because we do not hold one.
    expect(vi.mocked(confirmPayoutAccount).mock.calls[0]).toHaveLength(1)
  })

  it("does not select the wallet when the server will not confirm it", async () => {
    // Firebase accepted the code but our server cannot see the number on the account.
    // Selecting it anyway would hand the member a destination that cannot be paid.
    vi.mocked(confirmPayoutAccount).mockResolvedValue({
      ok: false,
      reason: "account_phone_not_verified",
    })
    const onSelect = vi.fn()
    vi.mocked(addPayoutAccount).mockResolvedValue({
      ok: false,
      reason: "account_awaiting_verification",
      account: account(),
    })
    vi.mocked(startPhoneLink).mockResolvedValue({ ok: true, confirm: linkAccepting("123456") })
    const user = userEvent.setup()
    render(<PayoutAccountPicker selectedId={null} onSelect={onSelect} />)
    await addMomo(user)
    await screen.findByText(/confirm your number/i)

    await user.type(screen.getByLabelText(/confirmation code/i), "123456")
    await user.click(screen.getByRole("button", { name: /^confirm$/i }))

    await waitFor(() => expect(confirmPayoutAccount).toHaveBeenCalled())
    expect(onSelect).not.toHaveBeenCalled()
    expect(await screen.findByText(/couldn't confirm that number/i)).toBeInTheDocument()
  })

  it("selects the wallet once both halves agree", async () => {
    const verified = account({ status: "verified" })
    vi.mocked(confirmPayoutAccount).mockResolvedValue({ ok: true, account: verified })
    const onSelect = vi.fn()
    vi.mocked(addPayoutAccount).mockResolvedValue({
      ok: false,
      reason: "account_awaiting_verification",
      account: account(),
    })
    vi.mocked(startPhoneLink).mockResolvedValue({ ok: true, confirm: linkAccepting("123456") })
    const user = userEvent.setup()
    render(<PayoutAccountPicker selectedId={null} onSelect={onSelect} />)
    await addMomo(user)
    await screen.findByText(/confirm your number/i)

    await user.type(screen.getByLabelText(/confirmation code/i), "123456")
    await user.click(screen.getByRole("button", { name: /^confirm$/i }))

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(verified))
  })

  it("explains the one-number limit when Firebase refuses the link", async () => {
    vi.mocked(addPayoutAccount).mockResolvedValue({
      ok: false,
      reason: "account_awaiting_verification",
      account: account(),
    })
    vi.mocked(startPhoneLink).mockResolvedValue({
      ok: false,
      reason: "phone_already_set",
      message: "+233209999999",
    })
    const user = userEvent.setup()
    render(<PayoutAccountPicker selectedId={null} onSelect={vi.fn()} />)
    await addMomo(user)

    expect(await screen.findByText(/\+233209999999/)).toBeInTheDocument()
    // Nothing to type into, because nothing was sent.
    expect(screen.getByLabelText(/confirmation code/i)).toBeDisabled()
  })
})

describe("showing a saved wallet", () => {
  it("cannot be chosen while it is still waiting to be confirmed", async () => {
    vi.mocked(listPayoutAccounts).mockResolvedValue([account()])
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<PayoutAccountPicker selectedId={null} onSelect={onSelect} />)

    await user.click(await screen.findByText(/Ada Obi/i))

    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.getByText(/needs confirming/i)).toBeInTheDocument()
    // And there is a way to finish it, rather than only a reason it cannot be used.
    expect(screen.getByRole("button", { name: /^confirm$/i })).toBeInTheDocument()
  })

  it("says which currency a foreign wallet is paid in", async () => {
    // The member's Cowries are naira. What lands in this wallet is not, and a screen that
    // does not say so is inviting them to compare two different numbers.
    vi.mocked(listPayoutAccounts).mockResolvedValue([account({ status: "verified" })])
    render(<PayoutAccountPicker selectedId={null} onSelect={vi.fn()} />)

    expect(await screen.findByText(/paid in GHS/i)).toBeInTheDocument()
  })

  it("does not label a bank account with a currency", async () => {
    vi.mocked(listPayoutAccounts).mockResolvedValue([
      account({
        rail: "ng_bank",
        status: "verified",
        bankName: "Access Bank",
        network: null,
        networkLabel: null,
        msisdn: null,
        currency: "NGN",
      }),
    ])
    render(<PayoutAccountPicker selectedId={null} onSelect={vi.fn()} />)

    await screen.findByText(/Access Bank/i)
    expect(screen.queryByText(/paid in/i)).not.toBeInTheDocument()
  })
})
