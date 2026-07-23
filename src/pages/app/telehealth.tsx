import { useState } from "react"
import { useNavigate } from "react-router"
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
import { useCareFlow } from "@/components/app/useCareFlow"
import { Routes } from "@/routes/constants"
import { getInitials } from "@/lib/utils"

type ServiceMode = "online" | "in_person"
type ServiceStatus = "active" | "archived"

type TelehealthService = {
  id: string
  title: string
  modes: ServiceMode[]
  duration: string
  price: number
  currency: string
  status: ServiceStatus
  bookingsCount: number
  postedDaysAgo: number
}

type TelehealthBooking = {
  id: string
  clientName: string
  serviceTitle: string
  mode: ServiceMode
  hostedBy: string
  when: string
  avatarBg: string
}

type TeamMemberOption = { id: string; name: string; role: string; avatarBg: string }

const TEAM_MEMBERS: TeamMemberOption[] = [
  { id: "tm-1", name: "Jerome Bell", role: "Registered Nurse | Mental Health Advocate", avatarBg: "bg-[#f5a623]" },
  { id: "tm-2", name: "Darrell Steward", role: "Registered Nurse | Mental Health Advocate", avatarBg: "bg-[#6b9cca]" },
]

const initialServices: TelehealthService[] = [
  { id: "svc-1", title: "Therapy", modes: ["online", "in_person"], duration: "30 min", price: 150, currency: "USD", status: "active", bookingsCount: 18, postedDaysAgo: 2 },
  { id: "svc-2", title: "Marriage counseling", modes: ["online"], duration: "30 min", price: 150, currency: "USD", status: "active", bookingsCount: 18, postedDaysAgo: 2 },
  { id: "svc-3", title: "Physiotherapy", modes: ["in_person"], duration: "1 hr", price: 150, currency: "USD", status: "archived", bookingsCount: 18, postedDaysAgo: 2 },
]

const bookings: TelehealthBooking[] = [
  { id: "bk-1", clientName: "Esther Howard", serviceTitle: "Therapy", mode: "online", hostedBy: "Jerome Bell", when: "Tomorrow 2:00PM", avatarBg: "bg-[#e7b8c9]" },
  { id: "bk-2", clientName: "Guy Hawkins", serviceTitle: "Therapy", mode: "in_person", hostedBy: "Darrell Steward", when: "15 May 2026 9:30 am", avatarBg: "bg-[#6b9cca]" },
  { id: "bk-3", clientName: "Annette Black", serviceTitle: "Marriage counseling", mode: "online", hostedBy: "Jerome Bell", when: "24 May 2026 8:30 am", avatarBg: "bg-[#87c9a8]" },
]

const MODE_LABEL: Record<ServiceMode, string> = { online: "Online", in_person: "In-person" }

const STATUS_PILL: Record<ServiceStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-[#eafaf1] text-[#10ad58]" },
  archived: { label: "Archive", className: "bg-[#1f2430] text-white" },
}

const MODE_CHECKBOX_CLASS = "rounded-md border-2 border-[#087fff] peer-checked:border-[#087fff] peer-checked:bg-[#087fff]"

function ModeCheckboxGroup({ modes, onToggle }: { modes: Set<ServiceMode>; onToggle: (mode: ServiceMode) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <Checkbox label="Online" checked={modes.has("online")} onChange={() => onToggle("online")} className={MODE_CHECKBOX_CLASS} />
      <Checkbox label="In-person" checked={modes.has("in_person")} onChange={() => onToggle("in_person")} className={MODE_CHECKBOX_CLASS} />
    </div>
  )
}

function TeamMemberPicker({ selected, onToggle }: { selected: Set<string>; onToggle: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const visible = TEAM_MEMBERS.filter((member) => member.name.toLowerCase().includes(search.toLowerCase()))
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
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-[#f5f8ff]"
              >
                <span className="flex items-center gap-3">
                  <span className={`flex size-10 items-center justify-center rounded-full text-sm font-semibold text-white ${member.avatarBg}`}>
                    {getInitials(member.name)}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-[#151922]">{member.name}</span>
                    <span className="block text-sm text-[#656f80]">{member.role}</span>
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={selected.has(member.id)}
                  onChange={() => onToggle(member.id)}
                  className="size-5 shrink-0 cursor-pointer rounded border-2 border-[#087fff] text-[#087fff] accent-[#087fff]"
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ServiceCreationDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (service: TelehealthService) => void
}) {
  const [modes, setModes] = useState<Set<ServiceMode>>(new Set(["online"]))
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [duration, setDuration] = useState("30 min")
  const [currency, setCurrency] = useState("USD")
  const [price, setPrice] = useState("")
  const [teamMemberIds, setTeamMemberIds] = useState<Set<string>>(new Set())

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
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Enter service title here, eg: HHA Registered care giver" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#151922]">Service description</label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the role of the applicant here"
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
                  <SelectItem value="15 min">15 min</SelectItem>
                  <SelectItem value="30 min">30 min</SelectItem>
                  <SelectItem value="45 min">45 min</SelectItem>
                  <SelectItem value="1 hr">1 hr</SelectItem>
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
            <TeamMemberPicker selected={teamMemberIds} onToggle={toggleTeamMember} />
          </div>

          <div className="flex justify-end">
            <Button
              className="bg-[#087fff] text-white hover:opacity-90"
              onClick={() => {
                if (!title.trim()) return
                onCreate({
                  id: `svc-${Date.now()}`,
                  title: title.trim(),
                  modes: modes.size > 0 ? Array.from(modes) : ["online"],
                  duration,
                  price: price.trim() ? Number(price) : 0,
                  currency,
                  status: "active",
                  bookingsCount: 0,
                  postedDaysAgo: 0,
                })
                onOpenChange(false)
              }}
            >
              Create service
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

function ServiceCard({ service, actionLabel }: { service: TelehealthService; actionLabel: string }) {
  const pill = STATUS_PILL[service.status]
  return (
    <div className="rounded-3xl border border-[#e5ecf5] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-[#151922]">{service.title}</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${pill.className}`}>{pill.label}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[#656f80]">
        <span className="inline-flex items-center gap-2">
          <Video className="size-4" />
          {service.modes.map((mode) => MODE_LABEL[mode]).join(" · ")}
        </span>
        <span className="inline-flex items-center gap-2">
          <CalendarCheck className="size-4" />
          {service.duration}
        </span>
        <span className="inline-flex items-center gap-2 font-semibold text-[#0f8a4d]">
          <Banknote className="size-4" />
          ${service.price}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-4 border-t border-[#eef1f3]">
        <span className="inline-flex items-center gap-2 text-sm text-[#656f80]">
          <CalendarCheck className="size-4" />
          {service.bookingsCount} Bookings · Posted {service.postedDaysAgo} days ago
        </span>
        <Button variant="outline" size="sm" className="rounded-full border-[#087fff] text-[#087fff] hover:bg-[#eef5ff]">
          {actionLabel}
        </Button>
      </div>
    </div>
  )
}

function BookingsSidebar({ items }: { items: TelehealthBooking[] }) {
  return (
    <div className="rounded-3xl border border-[#e5ecf5] bg-white p-5">
      <h2 className="text-base font-semibold text-[#151922]">Your bookings</h2>
      <div className="mt-4 space-y-5">
        {items.map((booking) => (
          <div key={booking.id} className="border-b border-[#eef1f3] pb-5 last:border-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`flex size-11 items-center justify-center rounded-full text-sm font-semibold text-white ${booking.avatarBg}`}>
                  {getInitials(booking.clientName)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#151922]">{booking.clientName}</p>
                  <p className="text-sm text-[#656f80]">
                    {booking.serviceTitle} · {MODE_LABEL[booking.mode]}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Message"
                className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#e5ecf5] text-[#565656] transition hover:bg-[#f2f6f8]"
              >
                <MessageSquare className="size-4" />
              </button>
            </div>
            <p className="mt-3 text-sm text-[#656f80]">Hosted by: {booking.hostedBy}</p>
            <p className="mt-1 inline-flex items-center gap-2 text-sm text-[#656f80]">
              <CalendarCheck className="size-4" />
              {booking.when}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

type UserService = {
  id: string
  title: string
  modes: ServiceMode[]
  duration: string
  price: number
  orgName: string
  orgLocation: string
  orgLogoBg: string
  postedLabel: string
  description: string
  includes: string[]
  suitableFor: string[]
}

const userServices: UserService[] = [
  {
    id: "usvc-1",
    title: "Speech & Language Therapy",
    modes: ["online", "in_person"],
    duration: "30 min",
    price: 150,
    orgName: "Harlem Hospital Center",
    orgLocation: "Pasadena, Oklahoma",
    orgLogoBg: "bg-[#1f2430]",
    postedLabel: "Posted 2 days ago",
    description:
      "Our licensed Speech & Language Therapists help children and adults overcome communication and swallowing challenges. Through personalized assessments and treatment plans, we work to improve speech clarity, language development, cognitive communication, and safe swallowing, empowering clients to communicate with confidence and maintain independence.",
    includes: [
      "Speech and language evaluations",
      "Communication and language therapy",
      "Swallowing (dysphagia) assessments",
      "Voice and articulation therapy",
      "Cognitive communication therapy",
      "Accent modification (where applicable)",
      "Family and caregiver education",
      "Progress tracking and treatment reviews",
    ],
    suitableFor: [
      "Speech delays",
      "Stroke recovery",
      "Neurological conditions",
      "Swallowing difficulties",
      "Voice disorders",
      "Language and communication challenges",
      "Cognitive impairments",
      "Developmental disorders",
    ],
  },
  {
    id: "usvc-2",
    title: "Physical therapy",
    modes: ["in_person"],
    duration: "1 Hour",
    price: 350,
    orgName: "NYU Langone Medical...",
    orgLocation: "Great Falls, Maryland",
    orgLogoBg: "bg-[#ffa33d]",
    postedLabel: "Posted 21/04/26",
    description:
      "Our physical therapy team creates hands-on rehabilitation plans that restore mobility, reduce pain, and rebuild strength after injury, surgery, or illness.",
    includes: ["Mobility and strength assessments", "Manual therapy", "Post-surgical rehabilitation", "Pain management techniques", "Home exercise programs"],
    suitableFor: ["Post-surgery recovery", "Chronic pain", "Sports injuries", "Balance and mobility issues"],
  },
  {
    id: "usvc-3",
    title: "Counseling",
    modes: ["online"],
    duration: "30 min",
    price: 55,
    orgName: "Gracie Square Hospital",
    orgLocation: "Kent, Utah",
    orgLogoBg: "bg-[#a782d8]",
    postedLabel: "Posted last week",
    description:
      "Confidential virtual counseling sessions with licensed mental health professionals, focused on building coping strategies for everyday stressors.",
    includes: ["Individual counseling sessions", "Stress and anxiety management", "Coping strategy planning"],
    suitableFor: ["Anxiety and stress", "Life transitions", "Burnout"],
  },
  {
    id: "usvc-4",
    title: "Therapy",
    modes: ["online", "in_person"],
    duration: "30 min",
    price: 150,
    orgName: "HHC Bellevue Hospital...",
    orgLocation: "Austin, TX",
    orgLogoBg: "bg-[#33b6a6]",
    postedLabel: "Posted 3 mins ago",
    description:
      "General therapy sessions covering a wide range of mental and behavioral health needs, delivered by licensed clinicians online or in person.",
    includes: ["Intake assessment", "Ongoing talk therapy", "Treatment plan reviews"],
    suitableFor: ["Mental health support", "Behavioral health concerns", "Ongoing counseling needs"],
  },
]

const TIME_SLOTS = ["12:00 Pm", "2:00 Pm", "6:00 Pm", "8:00 Pm"]
const DURATION_OPTIONS = ["15 mins", "30 mins", "45 mins", "1 hour"]

type PaymentOption = {
  id: string
  label: string
  iconBg: string
  icon?: typeof CreditCard
  image?: string
}

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
                    <span className="flex size-5 items-center justify-center rounded-full border-2 border-[#087fff]">
                      {localSelected === option.label && <span className="size-2.5 rounded-full bg-[#087fff]" />}
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
            className="w-full bg-[#087fff] text-white hover:opacity-90"
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

function ProfessionalPicker({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const visible = TEAM_MEMBERS.filter((member) => member.name.toLowerCase().includes(search.toLowerCase()))
  const selectedMember = TEAM_MEMBERS.find((member) => member.id === selectedId) ?? null

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
              <span className="block text-sm text-[#656f80]">{selectedMember.role}</span>
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
              <label
                key={member.id}
                onClick={() => {
                  onSelect(member.id)
                  setOpen(false)
                }}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-[#f5f8ff]"
              >
                <span className="flex items-center gap-3">
                  <span className={`flex size-10 items-center justify-center rounded-full text-sm font-semibold text-white ${member.avatarBg}`}>
                    {getInitials(member.name)}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-[#151922]">{member.name}</span>
                    <span className="block text-sm text-[#656f80]">{member.role}</span>
                  </span>
                </span>
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-[#087fff]">
                  {selectedId === member.id && <span className="size-2.5 rounded-full bg-[#087fff]" />}
                </span>
              </label>
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
}: {
  service: UserService | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const [step, setStep] = useState<BookingStep>("request")
  const [duration, setDuration] = useState(DURATION_OPTIONS[1])
  const [professionalId, setProfessionalId] = useState<string | null>(TEAM_MEMBERS[0].id)
  const [need, setNeed] = useState("")
  const [dateIndex, setDateIndex] = useState(2)
  const [time, setTime] = useState<string | null>(TIME_SLOTS[0])
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [bookingCode, setBookingCode] = useState("")

  const dates = Array.from({ length: 10 }, (_, index) => addDays(new Date(), index))
  const selectedDate = dates[dateIndex]
  const professional = TEAM_MEMBERS.find((member) => member.id === professionalId) ?? null

  const reset = () => {
    setStep("request")
    setDuration(DURATION_OPTIONS[1])
    setProfessionalId(TEAM_MEMBERS[0].id)
    setNeed("")
    setDateIndex(2)
    setTime(TIME_SLOTS[0])
    setPaymentMethod(null)
  }

  if (!service) return null

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) reset()
          onOpenChange(next)
        }}
      >
        <DialogContent showCloseButton className="p-0 max-w-140">
          <DialogHeader className="px-6 pt-6 text-left">
            <DialogTitle className="text-xl font-semibold text-[#151922]">{service.title}</DialogTitle>
          </DialogHeader>
          <DialogBody className="px-6 pt-4 pb-6 space-y-5">
            {step === "request" && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#151922]">Select period needed</label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#151922]">Select professional</label>
                  <ProfessionalPicker selectedId={professionalId} onSelect={setProfessionalId} />
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
                  <Button className="bg-[#087fff] text-white hover:opacity-90" onClick={() => setStep("schedule")}>
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
                    <p className="text-sm text-[#656f80]">{professional.role}</p>
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
                          index === dateIndex ? "border-[#087fff] bg-[#eef5ff] text-[#087fff]" : "border-[#eef1f3] text-[#656f80]"
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
                  <p className="text-sm text-[#656f80]">Select an available time slot</p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {TIME_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setTime(slot)}
                        className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                          time === slot ? "border-[#087fff] bg-[#eef5ff] text-[#087fff]" : "border-[#eef1f3] text-[#151922]"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
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

                <div className="rounded-xl bg-[#fff8e6] p-4 text-sm text-[#8a6d1f]">
                  Our <span className="font-semibold">Trade Assurance program</span> provides you with peace of mind. <span className="cursor-pointer font-semibold underline">Learn more</span>
                </div>

                <Button
                  className="w-full bg-[#087fff] text-white hover:opacity-90"
                  disabled={!paymentMethod}
                  onClick={() => {
                    setBookingCode(String(Math.floor(1000000 + Math.random() * 9000000)))
                    setStep("confirmed")
                  }}
                >
                  Checkout at ${service.price}
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
                <h3 className="mt-4 text-xl font-semibold text-[#151922]">You all set</h3>
                <p className="mt-2 text-sm text-[#656f80]">Your appointment is booked. We can&apos;t wait to see you!</p>
                <Button
                  className="mt-6 w-full bg-[#087fff] text-white hover:opacity-90"
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

function UserServiceBrowser() {
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState(userServices[0].id)
  const [bookingOpen, setBookingOpen] = useState(false)

  const visibleServices = search
    ? userServices.filter((service) => service.title.toLowerCase().includes(search.toLowerCase()))
    : userServices
  const selectedService = userServices.find((service) => service.id === selectedId) ?? userServices[0]

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

          {visibleServices.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => setSelectedId(service.id)}
              className={`w-full rounded-2xl border p-4 text-left transition ${
                selectedId === service.id ? "border-[#087fff] bg-[#f7fbff]" : "border-[#e5ecf5] hover:border-[#087fff]/40"
              }`}
            >
              <h3 className="text-sm font-semibold text-[#151922]">{service.title}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[#656f80]">
                <span className="inline-flex items-center gap-1.5">
                  <Video className="size-4" />
                  {service.modes.map((mode) => MODE_LABEL[mode]).join(" · ")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4" />
                  {service.duration}
                </span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#0f8a4d]">
                  <Banknote className="size-4" />
                  ${service.price}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#eef1f3] pt-3">
                <span className="flex items-center gap-2">
                  <span className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold text-white ${service.orgLogoBg}`}>
                    {getInitials(service.orgName)}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-[#151922]">{service.orgName}</span>
                    <span className="block text-xs text-[#8a8f98]">{service.orgLocation}</span>
                  </span>
                </span>
                <span className="text-xs text-[#8a8f98]">{service.postedLabel}</span>
              </div>
            </button>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className={`flex size-9 items-center justify-center rounded-full text-xs font-semibold text-white ${selectedService.orgLogoBg}`}>
                {getInitials(selectedService.orgName)}
              </span>
              <span>
                <span className="block text-sm font-semibold text-[#151922]">{selectedService.orgName}</span>
                <span className="flex items-center gap-1 text-xs text-[#8a8f98]">
                  <MapPin className="size-3" />
                  {selectedService.orgLocation}
                </span>
              </span>
            </span>
            <span className="inline-flex items-center gap-2 font-semibold text-[#0f8a4d]">
              <Banknote className="size-4" />
              ${selectedService.price}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-3 text-xl font-bold text-[#151922]">
              {selectedService.title}
              <span className="inline-flex items-center gap-1.5 text-sm font-normal text-[#656f80]">
                <Clock className="size-4" />
                {selectedService.duration}
              </span>
            </h2>
            <span className="inline-flex items-center gap-1.5 text-sm text-[#656f80]">
              <Video className="size-4" />
              {selectedService.modes.map((mode) => MODE_LABEL[mode]).join(" · ")}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button className="bg-[#087fff] text-white hover:opacity-90" onClick={() => setBookingOpen(true)}>
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
                <p className="mt-2 text-sm leading-6 text-[#4b5563]">{selectedService.description}</p>
              </div>
              <div>
                <p className="font-semibold text-[#151922]">Service Includes</p>
                <ul className="mt-2 space-y-1 text-sm text-[#4b5563]">
                  {selectedService.includes.map((item) => (
                    <li key={item}>· {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-[#151922]">Suitable For</p>
                <ul className="mt-2 space-y-1 text-sm text-[#4b5563]">
                  {selectedService.suitableFor.map((item) => (
                    <li key={item}>· {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BookServiceDialog service={selectedService} open={bookingOpen} onOpenChange={setBookingOpen} />
    </div>
  )
}

function AgencyTelehealthPage() {
  const [services, setServices] = useState<TelehealthService[]>(initialServices)
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)

  const visibleServices = search
    ? services.filter((service) => service.title.toLowerCase().includes(search.toLowerCase()))
    : services

  return (
    <div className="p-5 sm:p-8">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-2xl font-bold text-[#151922]">Telehealth</h1>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Title, keywords, or company"
                className="pl-9"
              />
            </div>
            <Button className="rounded-full bg-[#087fff] text-white hover:opacity-90" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Create service
            </Button>
          </div>

          <div className="mt-6 space-y-4">
            {visibleServices.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-[#e5ecf5] p-10 text-center text-sm text-[#657080]">
                No services found.
              </p>
            ) : (
              visibleServices.map((service) => <ServiceCard key={service.id} service={service} actionLabel="View bookings" />)
            )}
          </div>
        </div>

        <BookingsSidebar items={bookings} />
      </div>

      <ServiceCreationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={(service) => setServices((current) => [service, ...current])}
      />
    </div>
  )
}

export default function TelehealthPage() {
  const { flow } = useCareFlow()
  return flow === "agency" ? <AgencyTelehealthPage /> : <UserServiceBrowser />
}
