import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"
import { MemoryRouter } from "react-router"
import { BookingRowAction } from "../BookingRowAction"
import type { TelehealthBooking } from "@/utils/careconnect/types"

/**
 * Pins the behaviour that replaced the old fake "Download notes" action, which
 * only fired a toast and downloaded nothing.
 */

function makeBooking(overrides: Partial<TelehealthBooking> = {}): TelehealthBooking {
  return {
    id: "booking-1",
    serviceId: "service-1",
    serviceTitle: "Home visit",
    mode: "in_person",
    posterId: "agency-1",
    agencyName: "Acme Care",
    teamMemberId: "member-1",
    professionalUid: "pro-1",
    professionalName: "Ada Pro",
    clientId: "client-1",
    clientName: "Grace Client",
    dateKey: "2026-09-01",
    startMinutes: 600,
    endMinutes: 645,
    durationMinutes: 45,
    note: "",
    price: 65,
    currency: "USD",
    paymentMethod: "",
    paymentStatus: "pending",
    status: "completed",
    bookingCode: "1234567",
    ...overrides,
  } as TelehealthBooking
}

function renderAction(props: {
  booking: TelehealthBooking
  isProfessional: boolean
  onDetails?: (booking: TelehealthBooking) => void
  onRecord?: (booking: TelehealthBooking) => void
}) {
  const onDetails = props.onDetails ?? vi.fn()
  return {
    onDetails,
    ...render(
      <MemoryRouter>
        <BookingRowAction
          booking={props.booking}
          rowStatus="completed"
          isProfessional={props.isProfessional}
          onDetails={onDetails}
          onRecord={props.onRecord}
        />
      </MemoryRouter>,
    ),
  }
}

describe("BookingRowAction on a completed booking", () => {
  it("offers a professional the record when consent was given and none exists", async () => {
    const onRecord = vi.fn()
    const booking = makeBooking({
      recordConsent: { granted: true },
      hasRecord: false,
    })
    renderAction({ booking, isProfessional: true, onRecord })

    const button = screen.getByRole("button", { name: "Add record" })
    await userEvent.click(button)
    expect(onRecord).toHaveBeenCalledWith(booking)
  })

  it("says View record once one exists", () => {
    renderAction({
      booking: makeBooking({ recordConsent: { granted: true }, hasRecord: true }),
      isProfessional: true,
      onRecord: vi.fn(),
    })
    expect(screen.getByRole("button", { name: "View record" })).toBeInTheDocument()
  })

  it("falls back to details when the client did not consent to a record", async () => {
    const onRecord = vi.fn()
    const { onDetails } = renderAction({
      booking: makeBooking({ recordConsent: { granted: false } }),
      isProfessional: true,
      onRecord,
    })

    await userEvent.click(screen.getByRole("button", { name: "Details" }))
    expect(onRecord).not.toHaveBeenCalled()
    expect(onDetails).toHaveBeenCalled()
  })

  it("falls back to details when consent is absent entirely", async () => {
    const onRecord = vi.fn()
    const { onDetails } = renderAction({
      booking: makeBooking(),
      isProfessional: true,
      onRecord,
    })

    await userEvent.click(screen.getByRole("button", { name: "Details" }))
    expect(onRecord).not.toHaveBeenCalled()
    expect(onDetails).toHaveBeenCalled()
  })

  it("keeps working for hosts that pass no onRecord at all", async () => {
    // The agency analytics table renders this component without a record
    // surface, and must keep behaving as it did.
    const { onDetails } = renderAction({
      booking: makeBooking({ recordConsent: { granted: true }, hasRecord: true }),
      isProfessional: true,
    })

    await userEvent.click(screen.getByRole("button", { name: "Details" }))
    expect(onDetails).toHaveBeenCalled()
  })

  it("gives the client a plain View that opens the booking details", async () => {
    const onRecord = vi.fn()
    const { onDetails } = renderAction({
      booking: makeBooking({ recordConsent: { granted: true }, hasRecord: true }),
      isProfessional: false,
      onRecord,
    })

    await userEvent.click(screen.getByRole("button", { name: "View" }))
    expect(onRecord).not.toHaveBeenCalled()
    expect(onDetails).toHaveBeenCalled()
  })

  it("never offers to download anything", () => {
    renderAction({
      booking: makeBooking({ recordConsent: { granted: true } }),
      isProfessional: true,
      onRecord: vi.fn(),
    })
    expect(screen.queryByText(/download/i)).not.toBeInTheDocument()
  })
})
