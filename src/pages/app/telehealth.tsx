import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Link, useNavigate } from "react-router"
import { format } from "date-fns"
import {
  Banknote,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  Heart,
  HeartPulse,
  Info,
  MapPin,
  MessageSquare,
  Navigation,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Video,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddressAutocomplete } from "@/components/maps/AddressAutocomplete"
import { LocationMap } from "@/components/maps/LocationMap"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Radio } from "@/components/ui/radio"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { PaymentMethodDialog } from "@/components/booking/PaymentMethodDialog"
import { SlotPicker } from "@/components/booking/SlotPicker"
import {
  HealthProfileForm,
  BOOKING_FLOW_SECTIONS,
} from "@/components/health/HealthProfileForm"
import { isHealthProfileEmpty } from "@/utils/careconnect/healthProfile"
import {
  getConsentPolicies,
  getMyHealthProfile,
  upsertMyHealthProfile,
} from "@/utils/careconnect/services/clinicalService"
import { useCareFlow } from "@/components/app/useCareFlow"
import { Routes } from "@/routes/constants"
import { getInitials } from "@/lib/utils"
import { getAuthErrorMessage } from "@/utils/auth"
import {
  createService,
  createBooking,
  listBookings,
  listMyServices,
  listServices,
  searchServices,
  updateService,
  type SearchedService,
} from "@/utils/careconnect/services/telehealthService"
import { listMyTeam } from "@/utils/careconnect/services/teamService"
import {
  formatRelative,
  minutesToLabel,
  toDateKey,
  SERVICE_MODE_LABELS,
  type BookingLocation,
  type ClientHealthProfile,
  type ConsentPolicies,
  type ServiceMode,
  type TeamMember,
  type TelehealthBooking,
  type TelehealthService,
} from "@/utils/careconnect/types"

const DURATION_OPTIONS = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 hr", minutes: 60 },
  { label: "1 hr 30 min", minutes: 90 },
]

function formatDuration(minutes: number): string {
  const match = DURATION_OPTIONS.find((option) => option.minutes === minutes)
  if (match) return match.label
  if (minutes % 60 === 0) return `${minutes / 60} hr`
  return `${minutes} min`
}

function formatPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(price)
  } catch {
    return `${currency} ${price}`
  }
}

const STATUS_PILL: Record<TelehealthService["status"], { label: string; className: string }> = {
  active: { label: "Active", className: "bg-[#eafaf1] text-[#10ad58]" },
  archived: { label: "Archive", className: "bg-[#1f2430] text-white" },
}

/** Compose a display date from a booking's dateKey + startMinutes. */
function bookingWhen(booking: TelehealthBooking): string {
  const [year, month, day] = booking.dateKey.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  return `${format(date, "MMM d, yyyy")} · ${minutesToLabel(booking.startMinutes)}`
}

function ModeRadioGroup({ mode, onChange }: { mode: ServiceMode; onChange: (mode: ServiceMode) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <Radio name="service-mode" label="Online" checked={mode === "online"} onChange={() => onChange("online")} />
      <Radio name="service-mode" label="In-person" checked={mode === "in_person"} onChange={() => onChange("in_person")} />
    </div>
  )
}

function TeamMemberPicker({
  team,
  selected,
  onToggle,
}: {
  team: TeamMember[]
  selected: Set<string>
  onToggle: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  // Only members who accepted their invite can be assigned — an "invited" row has
  // no account behind it yet, so it can't be scheduled against a service.
  const assignable = team.filter((member) => member.status === "active")
  const pendingCount = team.length - assignable.length
  const visible = assignable.filter((member) => member.name.toLowerCase().includes(search.toLowerCase()))
  const summary = selected.size > 0 ? `${selected.size} member${selected.size > 1 ? "s" : ""} selected` : "-- select team member here --"

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-(--input-border) bg-(--input-bg) px-4 text-sm text-(--input-text) transition-colors focus-visible:border-primary"
      >
        <span className={selected.size === 0 ? "text-(--input-placeholder)" : ""}>{summary}</span>
        <ChevronDown className={`size-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-(--input-border) p-2">
          {assignable.length === 0 ? (
            <p className="px-2 py-3 text-sm text-[#657080]">
              {pendingCount > 0
                ? `No team members have accepted their invite yet (${pendingCount} pending). They'll appear here once they set up their account.`
                : "No team members yet. Invite professionals from your profile's Team tab."}
            </p>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Professional name, profession etc"
                  className="border-0 pl-9 shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="mt-1 space-y-1">
                {visible.map((member) => (
                  <label
                    key={member.id}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-[#eafbfb]"
                  >
                    <span className="flex items-center gap-3">
                      <span className={`flex size-10 items-center justify-center rounded-full text-sm font-semibold text-white ${member.avatarBg}`}>
                        {getInitials(member.name)}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-[#151922]">{member.name}</span>
                        <span className="block text-sm text-[#656f80]">{member.role || "Professional"}</span>
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={selected.has(member.id)}
                      onChange={() => onToggle(member.id)}
                      className="size-5 shrink-0 cursor-pointer rounded border-2 border-[#00b4b8] text-[#00b4b8] accent-[#00b4b8]"
                    />
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ServiceCreationDialog({
  open,
  onOpenChange,
  team,
  service,
  onCreated,
  onUpdated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  team: TeamMember[]
  service?: TelehealthService | null
  onCreated?: (service: TelehealthService) => void
  onUpdated?: (service: TelehealthService) => void
}) {
  const isEdit = !!service
  const [mode, setMode] = useState<ServiceMode>(service?.modes[0] ?? "online")
  const [title, setTitle] = useState(service?.title ?? "")
  const [description, setDescription] = useState(service?.description ?? "")
  const [duration, setDuration] = useState(service ? formatDuration(service.durationMinutes) : "30 min")
  const [currency, setCurrency] = useState(service?.currency ?? "USD")
  const [price, setPrice] = useState(service ? String(service.price) : "")
  const [teamMemberIds, setTeamMemberIds] = useState<Set<string>>(new Set(service?.teamMemberIds ?? []))
  const [saving, setSaving] = useState(false)

  const toggleTeamMember = (id: string) => {
    setTeamMemberIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const reset = () => {
    setMode("online")
    setTitle("")
    setDescription("")
    setDuration("30 min")
    setCurrency("USD")
    setPrice("")
    setTeamMemberIds(new Set())
  }

  const submit = async () => {
    if (!title.trim()) {
      toast.error("Service title is required")
      return
    }
    const priceNum = price.trim() ? Number(price) : 0
    if (Number.isNaN(priceNum)) {
      toast.error("Price must be a number")
      return
    }
    const durationMinutes = DURATION_OPTIONS.find((option) => option.label === duration)?.minutes ?? 30
    const payload = {
      title: title.trim(),
      description: description.trim(),
      modes: [mode],
      durationMinutes,
      price: priceNum,
      currency,
      teamMemberIds: Array.from(teamMemberIds),
    }
    setSaving(true)
    try {
      if (isEdit && service) {
        const updated = await updateService(service.id, payload)
        onUpdated?.(updated)
        toast.success("Service updated")
      } else {
        const created = await createService(payload)
        onCreated?.(created)
        toast.success("Service created")
        reset()
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isEdit) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent showCloseButton className="p-0 max-w-150">
        <DialogHeader className="px-6 pt-6 text-left">
          <DialogTitle className="text-xl font-semibold text-[#151922]">{isEdit ? "Edit service" : "Service creation"}</DialogTitle>
        </DialogHeader>
        <DialogBody className="px-6 pt-4 pb-6 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#151922]">Select service mode type</label>
            <ModeRadioGroup mode={mode} onChange={setMode} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#151922]">Service title</label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Enter service title here, eg: Speech & Language Therapy" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#151922]">Service description</label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the service here"
              className="min-h-30"
            />
          </div>

          <div className={mode === "online" ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
            {mode === "online" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-[#151922]">Select time</label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((option) => (
                      <SelectItem key={option.minutes} value={option.label}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="mb-2 block text-sm font-medium text-[#151922]">Enter price</label>
              <div className="flex gap-3">
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-28 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0.00" />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#151922]">Assign team members</label>
            <TeamMemberPicker team={team} selected={teamMemberIds} onToggle={toggleTeamMember} />
          </div>

          <div className="flex justify-end">
            <Button className="bg-[#00b4b8] text-white hover:opacity-90" disabled={saving} onClick={submit}>
              {saving ? (isEdit ? "Saving..." : "Creating...") : isEdit ? "Save changes" : "Create service"}
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

function ServiceCard({ service, onEdit }: { service: TelehealthService; onEdit: () => void }) {
  const pill = STATUS_PILL[service.status] ?? STATUS_PILL.active
  return (
    <div className="rounded-3xl border border-[#e5ecf5] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-[#151922]">{service.title}</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${pill.className}`}>{pill.label}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[#656f80]">
        <span className="inline-flex items-center gap-2">
          <Video className="size-4" />
          {service.modes.map((mode) => SERVICE_MODE_LABELS[mode]).join(" · ")}
        </span>
        <span className="inline-flex items-center gap-2">
          <Clock className="size-4" />
          {formatDuration(service.durationMinutes)}
        </span>
        <span className="inline-flex items-center gap-2 font-semibold text-[#0f8a4d]">
          <CreditCard className="size-4" />
          {formatPrice(service.price, service.currency)}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-4 border-t border-[#eef1f3]">
        <span className="inline-flex items-center gap-2 text-sm text-[#656f80]">
          <CalendarCheck className="size-4" />
          {service.bookingsCount} Bookings · Posted {formatRelative(service.createdAt)}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="rounded-lg gap-1.5 border-[#e2e2e2] text-[#151922] hover:border-[#00b4b8] hover:text-[#00b4b8]"
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-lg border-[#00b4b8] text-[#00b4b8] hover:bg-[#e3f8f8]"
          >
            <Link to={Routes.app.agency.serviceAnalytics(service.id)}>View analytics</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

function OverviewStatCard({
  label,
  value,
  action,
}: {
  label: string
  value: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-[#e5ecf5] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-2xl font-bold text-[#151922]">{value}</p>
        {action}
      </div>
      <p className="mt-1 text-sm text-[#656f80]">{label}</p>
    </div>
  )
}

function AgencyOverview({ services, team, bookings }: { services: TelehealthService[]; team: TeamMember[]; bookings: TelehealthBooking[] }) {
  const stats = useMemo(() => {
    const today = toDateKey(new Date())
    const now = new Date()
    const nonCancelled = bookings.filter((booking) => booking.status !== "cancelled")
    const completed = nonCancelled.filter((booking) => booking.status === "completed")
    const amountMade = completed.reduce((sum, booking) => sum + booking.price, 0)
    const currency = bookings[0]?.currency || services[0]?.currency || "USD"
    const todaysShifts = nonCancelled.filter((booking) => booking.dateKey === today).length
    const completedThisMonth = completed.filter((booking) => {
      const [year, month] = booking.dateKey.split("-").map(Number)
      return year === now.getFullYear() && month === now.getMonth() + 1
    }).length
    const activeStaff = team.filter((member) => member.status === "active").length
    const completionRate = nonCancelled.length > 0 ? Math.round((completed.length / nonCancelled.length) * 100) : 0

    return {
      amountMade: formatPrice(amountMade, currency),
      todaysShifts: String(todaysShifts),
      completedThisMonth: String(completedThisMonth),
      activeStaff: String(activeStaff),
      completionRate: `${completionRate}%`,
    }
  }, [services, team, bookings])

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-semibold text-[#151922]">Overview</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <OverviewStatCard
          label="Amount made"
          value={stats.amountMade}
          action={
            <Button
              size="sm"
              className="rounded-lg bg-[#00b4b8] text-white hover:opacity-90"
              onClick={() => toast("Withdrawals are coming soon.")}
            >
              Withdraw
            </Button>
          }
        />
        <OverviewStatCard label="Today's Shifts" value={stats.todaysShifts} />
        <OverviewStatCard label="Completed This Month" value={stats.completedThisMonth} />
        <OverviewStatCard label="Active Staff" value={stats.activeStaff} />
        <OverviewStatCard label="Service Completion Rate" value={stats.completionRate} />
      </div>
    </section>
  )
}

const BOOKINGS_PAGE_SIZE = 10

function BookingsSidebar({ bookings }: { bookings: TelehealthBooking[] }) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(bookings.length / BOOKINGS_PAGE_SIZE))

  // Clamp back onto a valid page if the list shrinks (e.g. a booking is cancelled off it).
  useEffect(() => {
    setPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  const visibleBookings = bookings.slice((page - 1) * BOOKINGS_PAGE_SIZE, page * BOOKINGS_PAGE_SIZE)

  const avatarBg = (id: string) => {
    const palette = ["bg-[#e7b8c9]", "bg-[#6b9cca]", "bg-[#87c9a8]", "bg-[#f5a623]", "bg-[#a782d8]"]
    const sum = [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    return palette[sum % palette.length]
  }
  return (
    <div className="rounded-3xl border border-[#e5ecf5] bg-white p-5">
      <h2 className="text-base font-semibold text-[#151922]">Your bookings</h2>
      {bookings.length === 0 ? (
        <p className="mt-4 text-sm text-[#657080]">No bookings yet.</p>
      ) : (
        <>
          <div className="mt-4 space-y-5">
            {visibleBookings.map((booking) => (
              <div key={booking.id} className="border-b border-[#eef1f3] pb-5 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex size-11 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarBg(booking.id)}`}>
                      {getInitials(booking.clientName)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#151922]">{booking.clientName}</p>
                      <p className="text-sm text-[#656f80]">
                        {booking.serviceTitle} · {SERVICE_MODE_LABELS[booking.mode]}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={Routes.app.agency.messages}
                    aria-label={`Message ${booking.clientName}`}
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#eef1f3] text-[#656f80] transition hover:border-[#00b4b8] hover:text-[#00b4b8]"
                  >
                    <MessageSquare className="size-4" />
                  </Link>
                </div>
                <p className="mt-3 text-sm text-[#656f80]">Hosted by: {booking.professionalName}</p>
                <p className="mt-1 inline-flex items-center gap-2 text-sm text-[#656f80]">
                  <CalendarCheck className="size-4" />
                  {bookingWhen(booking)}
                </p>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 mt-5 border-t border-[#eef1f3]">
              <button
                type="button"
                aria-label="Previous page"
                disabled={page === 1}
                onClick={() => setPage((current) => current - 1)}
                className="flex size-8 items-center justify-center rounded-lg text-[#657080] transition hover:bg-[#f2f6f8] disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-xs font-medium text-[#657080]">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                aria-label="Next page"
                disabled={page === totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="flex size-8 items-center justify-center rounded-lg text-[#657080] transition hover:bg-[#f2f6f8] disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ProfessionalPicker({
  members,
  selectedId,
  onSelect,
}: {
  members: TelehealthService["teamMembers"]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const visible = members.filter((member) => member.name.toLowerCase().includes(search.toLowerCase()))
  const selectedMember = members.find((member) => member.id === selectedId) ?? null

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-14 w-full items-center justify-between rounded-xl border border-(--input-border) bg-(--input-bg) px-4 text-sm text-(--input-text) transition-colors focus-visible:border-primary"
      >
        {selectedMember ? (
          <span className="flex items-center gap-3">
            <span className={`flex size-9 items-center justify-center rounded-full text-xs font-semibold text-white ${selectedMember.avatarBg}`}>
              {getInitials(selectedMember.name)}
            </span>
            <span className="text-left">
              <span className="block text-sm font-semibold text-[#151922]">{selectedMember.name}</span>
              <span className="block text-sm text-[#656f80]">{selectedMember.role || "Professional"}</span>
            </span>
          </span>
        ) : (
          <span className="text-(--input-placeholder)">-- select professional here --</span>
        )}
        <ChevronDown className={`size-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-(--input-border) p-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Professional name, profession etc"
              className="border-0 pl-9 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="mt-1 space-y-1">
            {visible.map((member) => (
              <button
                type="button"
                key={member.id}
                onClick={() => {
                  onSelect(member.id)
                  setOpen(false)
                }}
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-[#eafbfb]"
              >
                <span className="flex items-center gap-3">
                  <span className={`flex size-10 items-center justify-center rounded-full text-sm font-semibold text-white ${member.avatarBg}`}>
                    {getInitials(member.name)}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-[#151922]">{member.name}</span>
                    <span className="block text-sm text-[#656f80]">{member.role || "Professional"}</span>
                  </span>
                </span>
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-[#00b4b8]">
                  {selectedId === member.id && <span className="size-2.5 rounded-full bg-[#00b4b8]" />}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * The one place the booking flow offers intake.
 *
 * Two states rather than one form: a client with nothing saved is invited to add
 * details, and a returning client is told their saved profile is being used and
 * given a switch to leave it off this time. Neither state blocks Continue.
 */
function HealthIntakePrompt({
  loading,
  profile,
  attach,
  onAttachChange,
  onReview,
}: {
  loading: boolean
  profile: ClientHealthProfile | null
  attach: boolean
  onAttachChange: (next: boolean) => void
  onReview: () => void
}) {
  if (loading) return <Skeleton className="h-20 rounded-xl" />

  const hasProfile = !isHealthProfileEmpty(profile)

  if (!hasProfile) {
    return (
      <div className="rounded-xl border border-[#eef1f3] p-4">
        <p className="text-sm font-medium text-[#151922]">
          Share health details with your professional?
        </p>
        <p className="mt-1 text-sm text-[#657080]">
          Optional, and it helps them prepare for your visit.
        </p>
        <button
          type="button"
          onClick={onReview}
          className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-[#00898c] hover:opacity-80"
        >
          <HeartPulse className="size-4" />
          Add health details
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[#eef1f3] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#151922]">Using your saved health profile</p>
          <p className="mt-1 text-sm text-[#657080]">
            {profile?.updatedAt ? `Updated ${formatRelative(profile.updatedAt)}` : "Saved earlier"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm text-[#657080]">Attach</span>
          <Switch
            checked={attach}
            onCheckedChange={onAttachChange}
            aria-label="Attach my health profile to this booking"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onReview}
        className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-[#00898c] hover:opacity-80"
      >
        <HeartPulse className="size-4" />
        Review details
      </button>
    </div>
  )
}

/**
 * `health` is never on the default path: it is entered only by explicit opt-in
 * from the request step, and always offers a same-weight Skip. Intake must never
 * become a precondition for booking.
 */
type BookingStep = "location" | "request" | "health" | "schedule" | "confirmed"

/**
 * Exported for tests: the guarantee that intake and consent never block a
 * booking is worth asserting directly rather than through the whole page.
 */
export function BookServiceDialog({
  service,
  open,
  onOpenChange,
  onBooked,
}: {
  service: TelehealthService | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onBooked: () => void
}) {
  const navigate = useNavigate()
  const [step, setStep] = useState<BookingStep>("request")
  const [professionalId, setProfessionalId] = useState<string | null>(null)
  const [need, setNeed] = useState("")
  const [dateKey, setDateKey] = useState("")
  const [startMinutes, setStartMinutes] = useState<number | null>(null)
  const [bookingMode, setBookingMode] = useState<ServiceMode>("online")
  const [bookingLocation, setBookingLocation] = useState<BookingLocation | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [booking, setBooking] = useState(false)
  const [bookingCode, setBookingCode] = useState("")
  const [locatingCurrent, setLocatingCurrent] = useState(false)
  // Where "Continue" returns to from the address step, so the one address surface
  // serves both entry points: up-front for in-person-only services, and on demand
  // when someone picks In-person on a service that also offers Online.
  const [locationReturnStep, setLocationReturnStep] = useState<BookingStep>("request")
  // Clinical layer. `healthDraft` is edited in the health step and saved to the
  // reusable profile on continue; `attachHealth` decides whether the server
  // freezes a snapshot onto this booking; `recordConsent` is the per-visit
  // agreement that the professional may write a record.
  const [healthProfile, setHealthProfile] = useState<ClientHealthProfile | null>(null)
  const [healthDraft, setHealthDraft] = useState<ClientHealthProfile>({})
  const [healthLoading, setHealthLoading] = useState(false)
  const [savingHealth, setSavingHealth] = useState(false)
  const [attachHealth, setAttachHealth] = useState(true)
  const [recordConsent, setRecordConsent] = useState(true)
  const [consentPolicies, setConsentPolicies] = useState<ConsentPolicies | null>(null)

  const members = service?.teamMembers ?? []
  // Only when in-person is the *only* option is the address needed before anything
  // else; a service offering both can't know it's wanted until Session type is picked.
  const isInPersonOnly = service?.modes.length === 1 && service.modes[0] === "in_person"

  // Reset when (re)opening for a service.
  useEffect(() => {
    if (!open) return
    setStep(isInPersonOnly ? "location" : "request")
    setLocationReturnStep("request")
    setProfessionalId(members[0]?.id ?? null)
    setNeed("")
    setDateKey("")
    setStartMinutes(null)
    setBookingMode(service?.modes[0] ?? "online")
    setBookingLocation(null)
    setPaymentMethod(null)
    setBookingCode("")
    setLocatingCurrent(false)
    setAttachHealth(true)
    setRecordConsent(true)
    // members derives from service; safe to depend on open + service id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, service?.id])

  // Prefill from the saved profile, and fetch the consent wording so the version
  // the client agreed to is recorded. Both degrade quietly: a failure here must
  // not stop anyone booking.
  useEffect(() => {
    if (!open) return
    let active = true
    setHealthLoading(true)
    Promise.all([
      getMyHealthProfile().catch(() => null),
      getConsentPolicies().catch(() => null),
    ])
      .then(([profile, policies]) => {
        if (!active) return
        setHealthProfile(profile)
        setHealthDraft(profile ?? {})
        setConsentPolicies(policies)
      })
      .finally(() => {
        if (active) setHealthLoading(false)
      })
    return () => {
      active = false
    }
  }, [open])

  if (!service) return null

  const professional = members.find((member) => member.id === professionalId) ?? null

  /**
   * Drop the device's coordinates straight into the booking location. There's no
   * reverse-geocode step, so the address line carries the coordinates — the lat/lng
   * are what the professional's map actually needs.
   */
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location isn't available on this device")
      return
    }
    setLocatingCurrent(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setBookingLocation({
          address: `Current location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`,
          lat: latitude,
          lng: longitude,
        })
        setLocatingCurrent(false)
      },
      () => {
        toast.error("Couldn't get your current location")
        setLocatingCurrent(false)
      },
    )
  }

  const checkout = async () => {
    if (!professionalId || startMinutes == null) return
    setBooking(true)
    try {
      const created = await createBooking({
        serviceId: service.id,
        teamMemberId: professionalId,
        dateKey,
        startMinutes,
        mode: bookingMode,
        note: need,
        paymentMethod: paymentMethod ?? "",
        location: bookingMode === "in_person" && bookingLocation ? bookingLocation : undefined,
        attachHealthProfile: attachHealth,
        // Only claim consent when we know which wording was shown.
        recordConsent:
          recordConsent && consentPolicies
            ? { accepted: true, policyVersion: consentPolicies.record.version }
            : undefined,
      })
      setBookingCode(created.bookingCode)
      setStep("confirmed")
      onBooked()
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setBooking(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton className="p-0 max-w-140">
          <DialogHeader className="px-6 pt-6 text-left">
            <DialogTitle className="text-xl font-semibold text-[#151922]">
              {step === "location" ? "Where should we meet?" : service.title}
            </DialogTitle>
            {step === "location" && (
              <p className="text-sm text-[#657080]">
                Set the meeting address so your professional knows where to attend to you.
              </p>
            )}
          </DialogHeader>
          <DialogBody className="px-6 pt-4 pb-6 space-y-5">
            {step === "location" && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#151922]">Meeting address</label>
                  <AddressAutocomplete value={bookingLocation} onChange={setBookingLocation} />
                </div>

                <button
                  type="button"
                  onClick={useCurrentLocation}
                  disabled={locatingCurrent}
                  className="flex w-full items-center gap-3 rounded-xl border border-[#eef1f3] px-3 py-2.5 text-left transition hover:bg-[#f2f6f8]"
                >
                  <Navigation className="size-4 shrink-0 text-[#151922]" />
                  <span className="text-sm font-medium text-[#151922]">
                    {locatingCurrent ? "Locating…" : "Use current location"}
                  </span>
                </button>

                {/* Only renders a real map once the picked place resolved coordinates;
                    otherwise it shows the address text. */}
                <LocationMap
                  address={bookingLocation?.address}
                  lat={bookingLocation?.lat}
                  lng={bookingLocation?.lng}
                  className="h-56 w-full overflow-hidden rounded-2xl"
                />

                <div className="flex justify-end gap-2">
                  {locationReturnStep !== "request" && (
                    <Button type="button" variant="outline" onClick={() => setStep(locationReturnStep)}>
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="button"
                    disabled={!bookingLocation?.address.trim()}
                    className="bg-[#00b4b8] text-white hover:opacity-90"
                    onClick={() => setStep(locationReturnStep)}
                  >
                    Confirm location
                  </Button>
                </div>
              </>
            )}

            {step === "request" && (
              <>
                <div className="rounded-xl bg-[#f7fafc] p-4 text-sm text-[#656f80]">
                  <span className="inline-flex items-center gap-2">
                    <Clock className="size-4" />
                    {formatDuration(service.durationMinutes)}
                  </span>
                  <span className="ml-4 inline-flex items-center gap-2 font-semibold text-[#0f8a4d]">
                    <Banknote className="size-4" />
                    {formatPrice(service.price, service.currency)}
                  </span>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#151922]">Select professional</label>
                  {members.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[#e5ecf5] p-4 text-sm text-[#657080]">
                      This service has no available professionals yet.
                    </p>
                  ) : (
                    <ProfessionalPicker members={members} selectedId={professionalId} onSelect={setProfessionalId} />
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#151922]">Describe your need</label>
                  <Textarea
                    value={need}
                    onChange={(event) => setNeed(event.target.value)}
                    placeholder="e.g. I have an elderly patient who has struggled with speech for a while now."
                    className="min-h-25"
                  />
                </div>

                <HealthIntakePrompt
                  loading={healthLoading}
                  profile={healthProfile}
                  attach={attachHealth}
                  onAttachChange={setAttachHealth}
                  onReview={() => setStep("health")}
                />

                <div className="flex justify-end">
                  <Button
                    className="bg-[#00b4b8] text-white hover:opacity-90"
                    disabled={!professionalId}
                    onClick={() => setStep("schedule")}
                  >
                    Continue
                  </Button>
                </div>
              </>
            )}

            {step === "health" && (
              <>
                <div>
                  <p className="text-base font-semibold text-[#151922]">
                    Share health details
                  </p>
                  <p className="mt-1 text-sm text-[#657080]">
                    All optional. This is saved to your health profile, so you only enter it once.
                  </p>
                </div>

                {healthLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-24 rounded-xl" />
                    <Skeleton className="h-24 rounded-xl" />
                  </div>
                ) : (
                  <HealthProfileForm
                    value={healthDraft}
                    onChange={setHealthDraft}
                    sections={BOOKING_FLOW_SECTIONS}
                    includeHomeAccess={bookingMode === "in_person"}
                  />
                )}

                {/* Skip carries the same visual weight as continuing, so the
                    optionality is real rather than nominal. */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={savingHealth}
                    onClick={() => {
                      setAttachHealth(false)
                      setStep("schedule")
                    }}
                  >
                    Skip for now
                  </Button>
                  <Button
                    className="flex-1 bg-[#00b4b8] text-white hover:opacity-90"
                    disabled={savingHealth}
                    onClick={async () => {
                      setSavingHealth(true)
                      try {
                        // Save to the reusable profile immediately, so the effort
                        // is not lost if this booking is abandoned.
                        if (!isHealthProfileEmpty(healthDraft)) {
                          const saved = await upsertMyHealthProfile(healthDraft)
                          setHealthProfile(saved)
                          setHealthDraft(saved)
                          setAttachHealth(true)
                        }
                      } catch (error) {
                        // Never block the booking on a profile save.
                        toast.error(getAuthErrorMessage(error))
                      } finally {
                        setSavingHealth(false)
                        setStep("schedule")
                      }
                    }}
                  >
                    {savingHealth ? "Saving..." : "Save & continue"}
                  </Button>
                </div>
              </>
            )}

            {step === "schedule" && professional && (
              <>
                <div className="flex items-center gap-3">
                  <span className={`flex size-11 items-center justify-center rounded-full text-sm font-semibold text-white ${professional.avatarBg}`}>
                    {getInitials(professional.name)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#151922]">{professional.name}</p>
                    <p className="text-sm text-[#656f80]">{professional.role || "Professional"}</p>
                  </div>
                </div>

                <SlotPicker
                  serviceId={service.id}
                  teamMemberId={professionalId}
                  startMinutes={startMinutes}
                  onStartMinutesChange={setStartMinutes}
                  onDateKeyChange={setDateKey}
                />

                {service.modes.length > 1 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-[#151922]">Session type</p>
                    <div className="grid grid-cols-2 gap-2">
                      {service.modes.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setBookingMode(option)}
                          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                            bookingMode === option ? "border-[#00b4b8] bg-[#e3f8f8] text-[#00b4b8]" : "border-[#eef1f3] text-[#151922]"
                          }`}
                        >
                          {SERVICE_MODE_LABELS[option]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {bookingMode === "in_person" && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-[#151922]">Meeting address</p>
                    {/* Editing routes back to the address step so there's a single
                        autocomplete + map surface rather than two that disagree. */}
                    <button
                      type="button"
                      onClick={() => {
                        setLocationReturnStep("schedule")
                        setStep("location")
                      }}
                      className="flex h-14 w-full items-center justify-between gap-3 rounded-xl border border-[#eef1f3] px-4 text-left text-sm"
                    >
                      {bookingLocation?.address ? (
                        <span className="flex min-w-0 items-center gap-3 font-medium text-[#151922]">
                          <MapPin className="size-4 shrink-0" />
                          <span className="truncate">{bookingLocation.address}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-3 text-[#656f80]">
                          <Plus className="size-4" />
                          Set meeting address
                        </span>
                      )}
                      <ChevronRight className="size-4 shrink-0 text-[#8a8f98]" />
                    </button>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-sm font-medium text-[#151922]">Pay with</p>
                  <button
                    type="button"
                    onClick={() => setPaymentDialogOpen(true)}
                    className="flex h-14 w-full items-center justify-between rounded-xl border border-[#eef1f3] px-4 text-sm"
                  >
                    {paymentMethod ? (
                      <span className="flex items-center gap-3 font-medium text-[#151922]">
                        <CreditCard className="size-4" />
                        {paymentMethod}
                      </span>
                    ) : (
                      <span className="flex items-center gap-3 text-[#656f80]">
                        <Plus className="size-4" />
                        Select payment method
                      </span>
                    )}
                    <ChevronRight className="size-4 text-[#8a8f98]" />
                  </button>
                </div>

                {/* Record consent, immediately before committing. Default on:
                    a care visit without a note is the anomaly. Deliberately does
                    NOT feed the button's `disabled` expression below - consent is
                    a choice, not a gate. */}
                <div className="space-y-2 rounded-xl border border-[#eef1f3] p-4">
                  <Checkbox
                    checked={recordConsent}
                    onChange={(event) => setRecordConsent(event.target.checked)}
                    label={`I agree that ${professional.name} may write a visit record for this appointment.`}
                  />
                  <p className="pl-10 text-sm text-[#657080]">
                    They can only add a record for this visit. You can read it any time.
                  </p>
                  {!recordConsent && (
                    <p className="flex items-start gap-2 rounded-xl bg-[#fdf3e3] px-4 py-3 text-sm text-[#8a6d1f]">
                      <Info className="mt-0.5 size-4 shrink-0" />
                      <span>
                        Your professional will not be able to leave a visit record. You can allow
                        this later from the booking.
                      </span>
                    </p>
                  )}
                </div>

                <Button
                  className="w-full bg-[#00b4b8] text-white hover:opacity-90"
                  disabled={
                    startMinutes == null ||
                    (service.price > 0 && !paymentMethod) ||
                    (bookingMode === "in_person" && !bookingLocation) ||
                    booking
                  }
                  onClick={checkout}
                >
                  {booking
                    ? "Booking..."
                    : service.price > 0
                      ? `Confirm booking · ${formatPrice(service.price, service.currency)}`
                      : "Confirm booking"}
                </Button>
                {service.price > 0 && (
                  <p className="text-center text-sm text-[#657080]">
                    Payment is recorded, not charged - your professional will confirm arrangements.
                  </p>
                )}
              </>
            )}

            {step === "confirmed" && (
              <div className="flex flex-col items-center py-4 text-center">
                <CheckCircle2 className="size-12 text-[#d97a2b]" />
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#eef1f3] px-3 py-1.5 text-sm font-semibold text-[#151922]">
                  {bookingCode}
                  <button
                    type="button"
                    aria-label="Copy booking code"
                    onClick={() => navigator.clipboard?.writeText(bookingCode).catch(() => undefined)}
                  >
                    <Copy className="size-4 text-[#8a8f98]" />
                  </button>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-[#151922]">You&apos;re all set</h3>
                <p className="mt-2 text-sm text-[#656f80]">Your appointment is booked. We can&apos;t wait to see you!</p>
                <Button
                  className="mt-6 w-full bg-[#00b4b8] text-white hover:opacity-90"
                  onClick={() => {
                    onOpenChange(false)
                    navigate(Routes.app.user.schedule)
                  }}
                >
                  Check schedule
                </Button>
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <PaymentMethodDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        selected={paymentMethod}
        onSelect={setPaymentMethod}
      />
    </>
  )
}

function TelehealthSkeleton() {
  return (
    <div className="p-5 space-y-6 sm:p-8">
      <Skeleton className="h-10 w-60" />
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-32 rounded-3xl" />
      </div>
    </div>
  )
}

const SERVICES_PAGE_SIZE = 5

/** Matches the fields the search box has always advertised, not just the title. */
function serviceMatchesQuery(service: TelehealthService, query: string): boolean {
  const term = query.trim().toLowerCase()
  if (!term) return true
  return [
    service.title,
    service.description,
    service.agencyName,
    service.agencyLocation,
    ...(service.includes ?? []),
    ...(service.suitableFor ?? []),
  ].some((value) => String(value ?? "").toLowerCase().includes(term))
}

const AI_SEARCH_DEBOUNCE_MS = 600

function UserServiceBrowser() {
  const [services, setServices] = useState<TelehealthService[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [visibleServiceCount, setVisibleServiceCount] = useState(SERVICES_PAGE_SIZE)
  // AI results for the query currently in the box, or null when we're showing keyword
  // matches. Keeping the query alongside the results is what makes a late response for an
  // older query discardable.
  const [aiResults, setAiResults] = useState<{ query: string; services: SearchedService[] } | null>(null)
  const [aiSearching, setAiSearching] = useState(false)

  // Reset "Load more" progress whenever the underlying list changes — a new search term,
  // or AI results replacing the keyword matches.
  useEffect(() => {
    setVisibleServiceCount(SERVICES_PAGE_SIZE)
  }, [search, aiResults])

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const list = await listServices()
        if (!active) return
        setServices(list)
        setSelectedId((current) => current ?? list[0]?.id ?? null)
      } catch (error) {
        toast.error(getAuthErrorMessage(error))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  // Second tier: keyword matches are already on screen, so this only ever upgrades the
  // list. A failure or an empty AI result leaves the keyword matches standing.
  useEffect(() => {
    const query = search.trim()
    if (query.length < 3) {
      setAiResults(null)
      setAiSearching(false)
      return
    }

    let active = true
    setAiSearching(true)
    const timer = window.setTimeout(async () => {
      try {
        const result = await searchServices(query)
        if (!active) return
        setAiResults(result.aiRanked ? { query, services: result.services } : null)
      } catch {
        if (active) setAiResults(null)
      } finally {
        if (active) setAiSearching(false)
      }
    }, AI_SEARCH_DEBOUNCE_MS)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [search])

  if (loading) return <TelehealthSkeleton />

  const query = search.trim()
  const keywordMatches = query ? services.filter((service) => serviceMatchesQuery(service, query)) : services
  // Only trust AI results that belong to what's in the box right now.
  const showingAi = Boolean(query && aiResults && aiResults.query === query && aiResults.services.length > 0)
  const visibleServices: SearchedService[] = showingAi ? aiResults!.services : keywordMatches
  const shownServices = visibleServices.slice(0, visibleServiceCount)
  const selectedService = visibleServices.find((service) => service.id === selectedId) ?? visibleServices[0] ?? null

  return (
    <div className="p-5 sm:p-8">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Describe what you need, or search by title"
                className="pl-9"
              />
            </div>
            {/* Keyword matches are already rendered below; this only says whether the
                smarter pass has landed yet. */}
            {query.length >= 3 && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[#8a8f98]">
                {showingAi ? (
                  <>
                    <Sparkles className="size-3.5 text-[#00b4b8]" />
                    <span className="font-medium text-[#00898c]">Smart results</span>
                    <span>· matched on what you described</span>
                  </>
                ) : aiSearching ? (
                  <>
                    <Sparkles className="size-3.5 animate-pulse" />
                    <span>Looking for closer matches…</span>
                  </>
                ) : (
                  <span>Keyword matches</span>
                )}
              </p>
            )}
          </div>

          {visibleServices.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#e5ecf5] p-6 text-center text-sm text-[#657080]">
              No services found.
            </p>
          ) : (
            shownServices.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() => setSelectedId(service.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedId === service.id ? "border-[#00b4b8] bg-[#f0fbfb]" : "border-[#e5ecf5] hover:border-[#00b4b8]/40"
                }`}
              >
                <h3 className="text-sm font-semibold text-[#151922]">{service.title}</h3>
                {service.matchReason && (
                  <p className="mt-1 text-xs text-[#00898c]">{service.matchReason}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[#656f80]">
                  <span className="inline-flex items-center gap-1.5">
                    <Video className="size-4" />
                    {service.modes.map((mode) => SERVICE_MODE_LABELS[mode]).join(" · ")}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-4" />
                    {formatDuration(service.durationMinutes)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#0f8a4d]">
                    <Banknote className="size-4" />
                    {formatPrice(service.price, service.currency)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#eef1f3] pt-3">
                  <span className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-full bg-[#1f2430] text-xs font-semibold text-white">
                      {getInitials(service.agencyName || "?")}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-[#151922]">{service.agencyName || "Care Connect"}</span>
                      <span className="block text-xs text-[#8a8f98]">{service.agencyLocation || ""}</span>
                    </span>
                  </span>
                  <span className="text-xs text-[#8a8f98]">Posted {formatRelative(service.createdAt)}</span>
                </div>
              </button>
            ))
          )}

          {visibleServiceCount < visibleServices.length && (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVisibleServiceCount((current) => current + SERVICES_PAGE_SIZE)}
              >
                Load more
              </Button>
            </div>
          )}
        </div>

        {selectedService && (
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-full bg-[#1f2430] text-xs font-semibold text-white">
                  {getInitials(selectedService.agencyName || "?")}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[#151922]">{selectedService.agencyName || "Care Connect"}</span>
                  <span className="flex items-center gap-1 text-xs text-[#8a8f98]">
                    <MapPin className="size-3" />
                    {selectedService.agencyLocation || ""}
                  </span>
                </span>
              </span>
              <span className="inline-flex items-center gap-2 font-semibold text-[#0f8a4d]">
                <Banknote className="size-4" />
                {formatPrice(selectedService.price, selectedService.currency)}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-3 text-xl font-bold text-[#151922]">
                {selectedService.title}
                <span className="inline-flex items-center gap-1.5 text-sm font-normal text-[#656f80]">
                  <Clock className="size-4" />
                  {formatDuration(selectedService.durationMinutes)}
                </span>
              </h2>
              <span className="inline-flex items-center gap-1.5 text-sm text-[#656f80]">
                <Video className="size-4" />
                {selectedService.modes.map((mode) => SERVICE_MODE_LABELS[mode]).join(" · ")}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button className="bg-[#00b4b8] text-white hover:opacity-90" onClick={() => setBookingOpen(true)}>
                Book service
              </Button>
              <button type="button" aria-label="Save" className="flex size-11 items-center justify-center rounded-xl border border-[#e5ecf5] text-[#565656] hover:bg-[#f2f6f8]">
                <Heart className="size-4" />
              </button>
              {/* Share icon */}
              {/* <button type="button" aria-label="Share" className="flex size-11 items-center justify-center rounded-xl border border-[#e5ecf5] text-[#565656] hover:bg-[#f2f6f8]">
                <Share2 className="size-4" />
              </button> */}
            </div>

            <div className="mt-6 border-t border-[#eef1f3] pt-6">
              <h3 className="text-base font-semibold text-[#151922]">Service details</h3>
              <p className="mt-1 text-sm text-[#656f80]">Here&apos;s how the service details align with your interest.</p>

              <div className="mt-4 space-y-5 rounded-2xl bg-[#f7fafc] p-6">
                <div>
                  <p className="font-semibold text-[#151922]">Description</p>
                  <p className="mt-2 text-sm leading-6 text-[#4b5563]">{selectedService.description || "No description provided."}</p>
                </div>
                {selectedService.includes.length > 0 && (
                  <div>
                    <p className="font-semibold text-[#151922]">Service includes</p>
                    <ul className="mt-2 space-y-1 text-sm text-[#4b5563]">
                      {selectedService.includes.map((item) => (
                        <li key={item}>· {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedService.suitableFor.length > 0 && (
                  <div>
                    <p className="font-semibold text-[#151922]">Suitable for</p>
                    <ul className="mt-2 space-y-1 text-sm text-[#4b5563]">
                      {selectedService.suitableFor.map((item) => (
                        <li key={item}>· {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <BookServiceDialog
        service={selectedService}
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        onBooked={() => undefined}
      />
    </div>
  )
}

function AgencyTelehealthPage() {
  const [services, setServices] = useState<TelehealthService[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [bookings, setBookings] = useState<TelehealthBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [editingService, setEditingService] = useState<TelehealthService | null>(null)
  const [visibleServiceCount, setVisibleServiceCount] = useState(SERVICES_PAGE_SIZE)

  // Reset "Load more" progress whenever the search term changes the underlying list.
  useEffect(() => {
    setVisibleServiceCount(SERVICES_PAGE_SIZE)
  }, [search])

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const [myServices, myTeam, myBookings] = await Promise.all([
          listMyServices().catch(() => []),
          listMyTeam().catch(() => []),
          listBookings({ scope: "agency" }).catch(() => []),
        ])
        if (!active) return
        setServices(myServices)
        setTeam(myTeam)
        setBookings(myBookings)
      } catch (error) {
        if (active) toast.error(getAuthErrorMessage(error))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  if (loading) return <TelehealthSkeleton />

  const visibleServices = search
    ? services.filter((service) => service.title.toLowerCase().includes(search.toLowerCase()))
    : services
  const shownServices = visibleServices.slice(0, visibleServiceCount)

  return (
    <div className="p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#151922]">Telehealth</h1>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search for services..."
              className="pl-9"
            />
          </div>
          <Button className="rounded-full bg-[#00b4b8] text-white hover:opacity-90" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Create service
          </Button>
        </div>
      </div>

      <AgencyOverview services={services} team={team} bookings={bookings} />

      <div className="mt-6 grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="space-y-4">
            {visibleServices.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-[#e5ecf5] p-10 text-center text-sm text-[#657080]">
                No services yet. Click &quot;Create service&quot; to add your first one.
              </p>
            ) : (
              shownServices.map((service) => (
                <ServiceCard key={service.id} service={service} onEdit={() => setEditingService(service)} />
              ))
            )}
          </div>

          {visibleServiceCount < visibleServices.length && (
            <div className="flex justify-center mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVisibleServiceCount((current) => current + SERVICES_PAGE_SIZE)}
              >
                Load more
              </Button>
            </div>
          )}
        </div>

        <BookingsSidebar bookings={bookings} />
      </div>

      <ServiceCreationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        team={team}
        onCreated={(service) => setServices((current) => [service, ...current])}
      />

      <ServiceCreationDialog
        key={editingService?.id ?? "edit"}
        open={!!editingService}
        onOpenChange={(open) => !open && setEditingService(null)}
        team={team}
        service={editingService}
        onUpdated={(updated) => setServices((current) => current.map((item) => (item.id === updated.id ? updated : item)))}
      />
    </div>
  )
}

export default function TelehealthPage() {
  const { flow } = useCareFlow()
  return flow === "agency" ? <AgencyTelehealthPage /> : <UserServiceBrowser />
}
