import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { MemoryRouter } from "react-router"
import { BookServiceDialog } from "@/pages/app/telehealth"
import type { TelehealthService } from "@/utils/careconnect/types"

/**
 * The load-bearing guarantee of the client record layer: intake and consent are
 * optional, and neither can prevent someone booking a service.
 *
 * These assertions exist because that property is easy to lose by accident — a
 * new term in the checkout button's `disabled` expression, a required field in
 * the health step, or an unhandled rejection from the profile save would each
 * break it silently.
 */

const { createBooking, getSlots, getMyHealthProfile, getConsentPolicies, upsertMyHealthProfile } =
  vi.hoisted(() => ({
    createBooking: vi.fn(),
    getSlots: vi.fn(),
    getMyHealthProfile: vi.fn(),
    getConsentPolicies: vi.fn(),
    upsertMyHealthProfile: vi.fn(),
  }))

vi.mock("@/utils/careconnect/services/telehealthService", () => ({
  createBooking,
  getSlots,
  listServices: vi.fn(),
  listMyServices: vi.fn(),
  searchServices: vi.fn(),
  createService: vi.fn(),
  updateService: vi.fn(),
  listBookings: vi.fn(),
}))

vi.mock("@/utils/careconnect/services/clinicalService", () => ({
  getMyHealthProfile,
  getConsentPolicies,
  upsertMyHealthProfile,
}))

vi.mock("@/utils/careconnect/services/teamService", () => ({ listMyTeam: vi.fn() }))

const service: TelehealthService = {
  id: "service-1",
  posterId: "agency-1",
  agencyName: "Acme Care",
  agencyLocation: "Accra",
  title: "Home visit",
  description: "A home visit",
  modes: ["online"],
  durationMinutes: 30,
  // Free, so the payment method is not a factor in what we are asserting.
  price: 0,
  currency: "USD",
  includes: [],
  suitableFor: [],
  teamMemberIds: ["member-1"],
  teamMembers: [
    { id: "member-1", name: "Ada Pro", role: "Nurse", avatarBg: "bg-[#00b4b8]", uid: "pro-1" },
  ],
  status: "active",
  bookingsCount: 0,
}

function renderDialog() {
  return render(
    <MemoryRouter>
      <BookServiceDialog
        service={service}
        open
        onOpenChange={() => {}}
        onBooked={() => {}}
      />
    </MemoryRouter>,
  )
}

/** Advance from the request step to the schedule step and choose a slot. */
async function reachScheduleAndPickSlot() {
  await userEvent.click(screen.getByRole("button", { name: "Continue" }))
  const slot = await screen.findByRole("button", { name: "10:00 AM" })
  await userEvent.click(slot)
}

beforeEach(() => {
  vi.clearAllMocks()
  getSlots.mockResolvedValue({
    slots: [{ value: 600, label: "10:00 AM" }],
    durationMinutes: 30,
  })
  getConsentPolicies.mockResolvedValue({
    record: { version: "record-consent-v1", text: "Record consent wording" },
    sharing: { version: "sharing-consent-v1", text: "Sharing consent wording" },
  })
  getMyHealthProfile.mockResolvedValue(null)
  createBooking.mockResolvedValue({ bookingCode: "1234567" })
  upsertMyHealthProfile.mockResolvedValue({})
})

describe("booking is never blocked by the clinical layer", () => {
  it("books with the health step never visited", async () => {
    renderDialog()
    await reachScheduleAndPickSlot()

    const confirm = screen.getByRole("button", { name: /Confirm booking/ })
    expect(confirm).toBeEnabled()

    await userEvent.click(confirm)
    await waitFor(() => expect(createBooking).toHaveBeenCalled())
  })

  it("books with record consent unchecked, and says so in the payload", async () => {
    renderDialog()
    await reachScheduleAndPickSlot()

    // Default is checked: a care visit without a note is the anomaly.
    const consent = screen.getByRole("checkbox", {
      name: /may write a visit record/i,
    })
    expect(consent).toBeChecked()

    await userEvent.click(consent)
    expect(consent).not.toBeChecked()

    // Unchecking must not disable the button — consent is a choice, not a gate.
    const confirm = screen.getByRole("button", { name: /Confirm booking/ })
    expect(confirm).toBeEnabled()

    await userEvent.click(confirm)
    await waitFor(() => expect(createBooking).toHaveBeenCalled())
    expect(createBooking.mock.calls[0][0].recordConsent).toBeUndefined()
  })

  it("sends the agreed wording version when consent is left on", async () => {
    renderDialog()
    await waitFor(() => expect(getConsentPolicies).toHaveBeenCalled())
    await reachScheduleAndPickSlot()

    await userEvent.click(screen.getByRole("button", { name: /Confirm booking/ }))
    await waitFor(() => expect(createBooking).toHaveBeenCalled())

    expect(createBooking.mock.calls[0][0].recordConsent).toEqual({
      accepted: true,
      policyVersion: "record-consent-v1",
    })
  })

  it("books even when the consent wording cannot be loaded", async () => {
    // Without the wording we cannot claim informed consent, so the booking goes
    // through without it rather than failing.
    getConsentPolicies.mockRejectedValue(new Error("offline"))
    renderDialog()
    await reachScheduleAndPickSlot()

    await userEvent.click(screen.getByRole("button", { name: /Confirm booking/ }))
    await waitFor(() => expect(createBooking).toHaveBeenCalled())
    expect(createBooking.mock.calls[0][0].recordConsent).toBeUndefined()
  })

  it("books even when the health profile cannot be loaded", async () => {
    getMyHealthProfile.mockRejectedValue(new Error("offline"))
    renderDialog()
    await reachScheduleAndPickSlot()

    const confirm = screen.getByRole("button", { name: /Confirm booking/ })
    expect(confirm).toBeEnabled()
    await userEvent.click(confirm)
    await waitFor(() => expect(createBooking).toHaveBeenCalled())
  })

  it("offers Skip on the health step, and skipping detaches the profile", async () => {
    renderDialog()
    await userEvent.click(await screen.findByRole("button", { name: /Add health details/ }))

    const skip = await screen.findByRole("button", { name: "Skip for now" })
    // Skip must carry the same weight as continuing, not be a greyed-out link.
    expect(skip).toBeEnabled()
    await userEvent.click(skip)

    const slot = await screen.findByRole("button", { name: "10:00 AM" })
    await userEvent.click(slot)
    await userEvent.click(screen.getByRole("button", { name: /Confirm booking/ }))

    await waitFor(() => expect(createBooking).toHaveBeenCalled())
    expect(createBooking.mock.calls[0][0].attachHealthProfile).toBe(false)
    // Skipping must never write to the reusable profile.
    expect(upsertMyHealthProfile).not.toHaveBeenCalled()
  })

  it("still reaches the schedule step when saving the profile fails", async () => {
    upsertMyHealthProfile.mockRejectedValue(new Error("offline"))
    renderDialog()
    await userEvent.click(await screen.findByRole("button", { name: /Add health details/ }))

    // Put something in, so the save is actually attempted.
    await userEvent.click(await screen.findByRole("button", { name: "Asthma" }))
    await userEvent.click(screen.getByRole("button", { name: /Save & continue/ }))

    // A failed profile save must not trap the client on the health step.
    const slot = await screen.findByRole("button", { name: "10:00 AM" })
    expect(slot).toBeInTheDocument()
  })
})

describe("payment wording", () => {
  it("does not claim a charge has been made", async () => {
    renderDialog()
    await reachScheduleAndPickSlot()
    // "Checkout at $X" implied a charge that never happens.
    expect(screen.queryByText(/Checkout at/)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Confirm booking/ })).toBeInTheDocument()
  })
})
