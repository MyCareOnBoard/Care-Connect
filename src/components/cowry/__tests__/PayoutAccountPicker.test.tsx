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

/**
 * Choosing where a withdrawal is paid.
 *
 * The cases kept here are the ones where getting it wrong costs a member money or locks
 * them out of their own, rather than the ones that merely look wrong:
 *
 *   - a mobile money wallet must not become payable without the texted code, because on
 *     that rail the code is the ONLY thing proving the number is theirs;
 *   - a first wrong code must not cost them the account, or a fat-fingered digit means
 *     starting over;
 *   - a rail the server cannot verify must not be offered, because every attempt would be
 *     refused at the end after the member had done the work.
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

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const account = (over: Partial<CowryPayoutAccount> = {}): CowryPayoutAccount => ({
  id: "a1",
  rail: "mobile_money",
  label: null,
  status: "awaiting_code",
  resolvedName: "Ada Obi",
  bankCode: null,
  bankName: null,
  network: "mtn_gh",
  networkLabel: "MTN Mobile Money",
  currency: "GHS",
  masked: "••••4567",
  isDefault: true,
  rejectionReason: null,
  ...over,
})

const NETWORKS = [
  { key: "mtn_gh", label: "MTN Mobile Money", currency: "GHS", dialCode: "233" },
]

beforeEach(() => {
  vi.mocked(listPayoutAccounts).mockResolvedValue([])
  vi.mocked(listPayoutBanks).mockResolvedValue([{ code: "044", name: "Access Bank" }])
  vi.mocked(listPayoutNetworks).mockResolvedValue({ available: true, networks: NETWORKS })
  vi.mocked(removePayoutAccount).mockResolvedValue(undefined)
  vi.clearAllMocks()
  vi.mocked(listPayoutAccounts).mockResolvedValue([])
  vi.mocked(listPayoutBanks).mockResolvedValue([{ code: "044", name: "Access Bank" }])
  vi.mocked(listPayoutNetworks).mockResolvedValue({ available: true, networks: NETWORKS })
})

describe("offering mobile money", () => {
  it("does not offer the rail when the server cannot verify a number", async () => {
    // Every attempt would be refused at the end, after the member had chosen a network
    // and typed their number. Better not to offer it.
    vi.mocked(listPayoutNetworks).mockResolvedValue({ available: false, networks: [] })
    const user = userEvent.setup()
    render(<PayoutAccountPicker selectedId={null} onSelect={vi.fn()} />)

    await user.click(await screen.findByRole("button", { name: /add/i }))
    await waitFor(() => expect(listPayoutNetworks).toHaveBeenCalled())

    expect(screen.getByRole("tab", { name: /mobile money/i })).toBeDisabled()
    expect(screen.getByText(/isn't available yet/i)).toBeInTheDocument()
  })

  it("builds the international number from the network, not from the member", async () => {
    // A locally written number starts with a 0 that is not part of the international
    // form. Sending it through would be refused for a reason nobody could interpret.
    vi.mocked(addPayoutAccount).mockResolvedValue({
      ok: false,
      reason: "account_awaiting_code",
      account: account(),
    })
    const user = userEvent.setup()
    render(<PayoutAccountPicker selectedId={null} onSelect={vi.fn()} />)

    await user.click(await screen.findByRole("button", { name: /add/i }))
    await waitFor(() => expect(listPayoutNetworks).toHaveBeenCalled())
    await user.click(screen.getByRole("tab", { name: /mobile money/i }))

    await user.click(screen.getByLabelText(/network/i))
    await user.click(await screen.findByRole("option", { name: /MTN Mobile Money/i }))
    await user.type(screen.getByLabelText(/mobile money number/i), "0201234567")

    await user.click(screen.getByRole("button", { name: /text me a code/i }))

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
      reason: "account_awaiting_code",
      account: account(),
    })
    const user = userEvent.setup()
    render(<PayoutAccountPicker selectedId={null} onSelect={vi.fn()} />)

    await user.click(await screen.findByRole("button", { name: /add/i }))
    await waitFor(() => expect(listPayoutNetworks).toHaveBeenCalled())
    await user.click(screen.getByRole("tab", { name: /mobile money/i }))
    await user.click(screen.getByLabelText(/network/i))
    await user.click(await screen.findByRole("option", { name: /MTN Mobile Money/i }))
    await user.type(screen.getByLabelText(/mobile money number/i), "201234567")
    await user.click(screen.getByRole("button", { name: /text me a code/i }))

    await waitFor(() => expect(addPayoutAccount).toHaveBeenCalled())
    expect(vi.mocked(addPayoutAccount).mock.calls[0][0]).not.toHaveProperty("currency")
  })
})

describe("confirming a mobile money number", () => {
  async function openCodeDialog() {
    vi.mocked(addPayoutAccount).mockResolvedValue({
      ok: false,
      reason: "account_awaiting_code",
      account: account(),
    })
    const user = userEvent.setup()
    render(<PayoutAccountPicker selectedId={null} onSelect={vi.fn()} />)

    await user.click(await screen.findByRole("button", { name: /add/i }))
    await waitFor(() => expect(listPayoutNetworks).toHaveBeenCalled())
    await user.click(screen.getByRole("tab", { name: /mobile money/i }))
    await user.click(screen.getByLabelText(/network/i))
    await user.click(await screen.findByRole("option", { name: /MTN Mobile Money/i }))
    await user.type(screen.getByLabelText(/mobile money number/i), "201234567")
    await user.click(screen.getByRole("button", { name: /text me a code/i }))

    await screen.findByText(/confirm your number/i)
    return user
  }

  it("asks for the code instead of reporting the wallet as saved", async () => {
    // The account exists, but nothing has proved the member holds the number. Treating
    // this as success is exactly the state this rail must never reach.
    const user = await openCodeDialog()
    expect(screen.getByLabelText(/confirmation code/i)).toBeInTheDocument()
    expect(user).toBeTruthy()
  })

  it("keeps the field open on a wrong code, so one bad digit is survivable", async () => {
    const user = await openCodeDialog()
    vi.mocked(confirmPayoutAccount).mockResolvedValue({ ok: false, reason: "sms_code_wrong" })

    await user.type(screen.getByLabelText(/confirmation code/i), "000000")
    await user.click(screen.getByRole("button", { name: /^confirm$/i }))

    await waitFor(() => expect(confirmPayoutAccount).toHaveBeenCalled())
    // Still there to try again. Closing it would mean starting the whole wallet over.
    expect(screen.getByLabelText(/confirmation code/i)).toBeInTheDocument()
  })

  it("closes on an expired code, because the account went with it", async () => {
    const user = await openCodeDialog()
    vi.mocked(confirmPayoutAccount).mockResolvedValue({ ok: false, reason: "sms_code_burnt" })

    await user.type(screen.getByLabelText(/confirmation code/i), "000000")
    await user.click(screen.getByRole("button", { name: /^confirm$/i }))

    await waitFor(() =>
      expect(screen.queryByText(/confirm your number/i)).not.toBeInTheDocument(),
    )
  })

  it("selects the wallet once the code is accepted", async () => {
    const verified = account({ status: "verified" })
    vi.mocked(addPayoutAccount).mockResolvedValue({
      ok: false,
      reason: "account_awaiting_code",
      account: account(),
    })
    vi.mocked(confirmPayoutAccount).mockResolvedValue({ ok: true, account: verified })
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<PayoutAccountPicker selectedId={null} onSelect={onSelect} />)

    await user.click(await screen.findByRole("button", { name: /add/i }))
    await waitFor(() => expect(listPayoutNetworks).toHaveBeenCalled())
    await user.click(screen.getByRole("tab", { name: /mobile money/i }))
    await user.click(screen.getByLabelText(/network/i))
    await user.click(await screen.findByRole("option", { name: /MTN Mobile Money/i }))
    await user.type(screen.getByLabelText(/mobile money number/i), "201234567")
    await user.click(screen.getByRole("button", { name: /text me a code/i }))

    await screen.findByText(/confirm your number/i)
    await user.type(screen.getByLabelText(/confirmation code/i), "123456")
    await user.click(screen.getByRole("button", { name: /^confirm$/i }))

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(verified))
  })
})

describe("showing a saved wallet", () => {
  it("cannot be chosen while it is still waiting for its code", async () => {
    vi.mocked(listPayoutAccounts).mockResolvedValue([account()])
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<PayoutAccountPicker selectedId={null} onSelect={onSelect} />)

    const row = await screen.findByText(/Ada Obi/i)
    await user.click(row)

    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.getByText(/needs your code/i)).toBeInTheDocument()
    // And there is a way to finish it, rather than only a reason it cannot be used.
    expect(screen.getByRole("button", { name: /enter code/i })).toBeInTheDocument()
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
        currency: "NGN",
      }),
    ])
    render(<PayoutAccountPicker selectedId={null} onSelect={vi.fn()} />)

    await screen.findByText(/Access Bank/i)
    expect(screen.queryByText(/paid in/i)).not.toBeInTheDocument()
  })
})
