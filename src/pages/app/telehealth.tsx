import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Link, useNavigate } from "react-router"
import { format, addDays } from "date-fns"
import {
  Banknote,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  Heart,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  Share2,
  Video,
} from "lucide-react"
import paypalIcon from "@/assets/imgs/PayPal Icon.png"
import applePayIcon from "@/assets/imgs/Apple Pay Icon.png"
import googlePayIcon from "@/assets/imgs/Google Pay Icon.png"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { useCareFlow } from "@/components/app/useCareFlow"
import { Routes } from "@/routes/constants"
import { getInitials } from "@/lib/utils"
import { getAuthErrorMessage } from "@/utils/auth"
import {
  createService,
  createBooking,
  getSlots,
  listBookings,
  listMyServices,
  listServices,
} from "@/utils/careconnect/services/telehealthService"
import { listMyTeam } from "@/utils/careconnect/services/teamService"
import {
  formatRelative,
  minutesToLabel,
  toDateKey,
  SERVICE_MODE_LABELS,
  type BookingSlot,
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

const MODE_CHECKBOX_CLASS = "rounded-md border-2 border-[#00b4b8] peer-checked:border-[#00b4b8] peer-checked:bg-[#00b4b8]"

/** Compose a display date from a booking's dateKey + startMinutes. */
function bookingWhen(booking: TelehealthBooking): string {
  const [year, month, day] = booking.dateKey.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  return `${format(date, "MMM d, yyyy")} · ${minutesToLabel(booking.startMinutes)}`
}

function ModeCheckboxGroup({ modes, onToggle }: { modes: Set<ServiceMode>; onToggle: (mode: ServiceMode) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <Checkbox label="Online" checked={modes.has("online")} onChange={() => onToggle("online")} className={MODE_CHECKBOX_CLASS} />
      <Checkbox label="In-person" checked={modes.has("in_person")} onChange={() => onToggle("in_person")} className={MODE_CHECKBOX_CLASS} />
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
  const visible = team.filter((member) => member.name.toLowerCase().includes(search.toLowerCase()))
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
          {team.length === 0 ? (
            <p className="px-2 py-3 text-sm text-[#657080]">
              No team members yet. Invite professionals from your profile&apos;s Team tab.
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
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  team: TeamMember[]
  onCreated: (service: TelehealthService) => void
}) {
  const [modes, setModes] = useState<Set<ServiceMode>>(new Set(["online"]))
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [duration, setDuration] = useState("30 min")
  const [currency, setCurrency] = useState("USD")
  const [price, setPrice] = useState("")
  const [teamMemberIds, setTeamMemberIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const toggleMode = (mode: ServiceMode) => {
    setModes((current) => {
      const next = new Set(current)
      if (next.has(mode)) next.delete(mode)
      else next.add(mode)
      return next
    })
  }

  const toggleTeamMember = (id: string) => {
    setTeamMemberIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const reset = () => {
    setModes(new Set(["online"]))
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
    setSaving(true)
    try {
      const service = await createService({
        title: title.trim(),
        description: description.trim(),
        modes: modes.size > 0 ? Array.from(modes) : ["online"],
        durationMinutes,
        price: priceNum,
        currency,
        teamMemberIds: Array.from(teamMemberIds),
      })
      onCreated(service)
      toast.success("Service created")
      reset()
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
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent showCloseButton className="p-0 max-w-150">
        <DialogHeader className="px-6 pt-6 text-left">
          <DialogTitle className="text-xl font-semibold text-[#151922]">Service creation</DialogTitle>
        </DialogHeader>
        <DialogBody className="px-6 pt-4 pb-6 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#151922]">Select service mode type</label>
            <ModeCheckboxGroup modes={modes} onToggle={toggleMode} />
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

          <div className="grid gap-4 sm:grid-cols-2">
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
              {saving ? "Creating..." : "Create service"}
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

function ServiceCard({ service }: { service: TelehealthService }) {
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

function BookingsSidebar({ bookings }: { bookings: TelehealthBooking[] }) {
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
        <div className="mt-4 space-y-5">
          {bookings.map((booking) => (
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
      )}
    </div>
  )
}

/* ── Payment (record-only) ────────────────────────────────────────────────── */

type PaymentOption = { id: string; label: string; iconBg: string; icon?: typeof CreditCard; image?: string }

const PAYMENT_METHODS: { group: string; options: PaymentOption[] }[] = [
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

function PaymentMethodDialog({
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
                        {option.icon ? <option.icon className="size-4" /> : <img src={option.image} alt="" className="size-10 object-contain" />}
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

type BookingStep = "request" | "schedule" | "confirmed"

function BookServiceDialog({
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
  const [dateIndex, setDateIndex] = useState(0)
  const [slots, setSlots] = useState<BookingSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [startMinutes, setStartMinutes] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [booking, setBooking] = useState(false)
  const [bookingCode, setBookingCode] = useState("")

  const dates = Array.from({ length: 10 }, (_, index) => addDays(new Date(), index))
  const selectedDate = dates[dateIndex]
  const members = service?.teamMembers ?? []

  // Reset when (re)opening for a service.
  useEffect(() => {
    if (!open) return
    setStep("request")
    setProfessionalId(members[0]?.id ?? null)
    setNeed("")
    setDateIndex(0)
    setSlots([])
    setStartMinutes(null)
    setPaymentMethod(null)
    setBookingCode("")
    // members derives from service; safe to depend on open + service id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, service?.id])

  // Fetch availability-constrained slots when the professional/date changes.
  useEffect(() => {
    if (step !== "schedule" || !service || !professionalId) return
    let active = true
    setSlotsLoading(true)
    setStartMinutes(null)
    getSlots(service.id, professionalId, toDateKey(selectedDate))
      .then((result) => {
        if (active) setSlots(result.slots)
      })
      .catch(() => {
        if (active) setSlots([])
      })
      .finally(() => {
        if (active) setSlotsLoading(false)
      })
    return () => {
      active = false
    }
  }, [step, service, professionalId, selectedDate])

  if (!service) return null

  const professional = members.find((member) => member.id === professionalId) ?? null

  const checkout = async () => {
    if (!professionalId || startMinutes == null) return
    setBooking(true)
    try {
      const created = await createBooking({
        serviceId: service.id,
        teamMemberId: professionalId,
        dateKey: toDateKey(selectedDate),
        startMinutes,
        mode: service.modes[0] ?? "online",
        note: need,
        paymentMethod: paymentMethod ?? "",
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
            <DialogTitle className="text-xl font-semibold text-[#151922]">{service.title}</DialogTitle>
          </DialogHeader>
          <DialogBody className="px-6 pt-4 pb-6 space-y-5">
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

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#151922]">Select date & time</label>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-[#151922]">{format(selectedDate, "MMM d")}</p>
                      <p className="text-sm text-[#656f80]">{format(selectedDate, "EEEE")}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {dates.map((date, index) => (
                      <button
                        key={date.toISOString()}
                        type="button"
                        onClick={() => setDateIndex(index)}
                        className={`flex shrink-0 flex-col items-center rounded-xl border px-3 py-2 text-sm transition ${
                          index === dateIndex ? "border-[#00b4b8] bg-[#e3f8f8] text-[#00b4b8]" : "border-[#eef1f3] text-[#656f80]"
                        }`}
                      >
                        <span className="font-semibold">{format(date, "d")}</span>
                        <span className="text-xs">{format(date, "EEE")}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-[#151922]">Select time</p>
                  <p className="text-sm text-[#656f80]">Available slots for this professional</p>
                  {slotsLoading ? (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <Skeleton key={index} className="h-10 rounded-xl" />
                      ))}
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="mt-3 rounded-xl border border-dashed border-[#e5ecf5] p-4 text-center text-sm text-[#657080]">
                      No open slots on this day.
                    </p>
                  ) : (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {slots.map((slot) => (
                        <button
                          key={slot.value}
                          type="button"
                          onClick={() => setStartMinutes(slot.value)}
                          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                            startMinutes === slot.value ? "border-[#00b4b8] bg-[#e3f8f8] text-[#00b4b8]" : "border-[#eef1f3] text-[#151922]"
                          }`}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

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

                <Button
                  className="w-full bg-[#00b4b8] text-white hover:opacity-90"
                  disabled={startMinutes == null || (service.price > 0 && !paymentMethod) || booking}
                  onClick={checkout}
                >
                  {booking ? "Booking..." : `Checkout at ${formatPrice(service.price, service.currency)}`}
                </Button>
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

function UserServiceBrowser() {
  const [services, setServices] = useState<TelehealthService[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [bookingOpen, setBookingOpen] = useState(false)

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

  if (loading) return <TelehealthSkeleton />

  const visibleServices = search
    ? services.filter((service) => service.title.toLowerCase().includes(search.toLowerCase()))
    : services
  const selectedService = services.find((service) => service.id === selectedId) ?? visibleServices[0] ?? null

  return (
    <div className="p-5 sm:p-8">
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Service title, keywords, or company"
              className="pl-9"
            />
          </div>

          {visibleServices.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#e5ecf5] p-6 text-center text-sm text-[#657080]">
              No services found.
            </p>
          ) : (
            visibleServices.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() => setSelectedId(service.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedId === service.id ? "border-[#00b4b8] bg-[#f0fbfb]" : "border-[#e5ecf5] hover:border-[#00b4b8]/40"
                }`}
              >
                <h3 className="text-sm font-semibold text-[#151922]">{service.title}</h3>
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
              <button type="button" aria-label="Share" className="flex size-11 items-center justify-center rounded-xl border border-[#e5ecf5] text-[#565656] hover:bg-[#f2f6f8]">
                <Share2 className="size-4" />
              </button>
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
              placeholder="Title, keywords, or company"
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

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="space-y-4">
            {visibleServices.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-[#e5ecf5] p-10 text-center text-sm text-[#657080]">
                No services yet. Click &quot;Create service&quot; to add your first one.
              </p>
            ) : (
              visibleServices.map((service) => <ServiceCard key={service.id} service={service} />)
            )}
          </div>
        </div>

        <BookingsSidebar bookings={bookings} />
      </div>

      <ServiceCreationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        team={team}
        onCreated={(service) => setServices((current) => [service, ...current])}
      />
    </div>
  )
}

export default function TelehealthPage() {
  const { flow } = useCareFlow()
  return flow === "agency" ? <AgencyTelehealthPage /> : <UserServiceBrowser />
}
