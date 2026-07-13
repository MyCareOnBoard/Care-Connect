import { useState } from "react"
import { MoreHorizontal, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ChatThread, type ChatMessage } from "@/components/app/ChatThread"
import { useCareFlow } from "@/components/app/useCareFlow"
import { useDelayedLoading } from "@/hooks/useDelayedLoading"
import { cn } from "@/lib/utils"

type Conversation = {
  id: string
  name: string
  subtitle: string
  initials: string
  color: string
  preview: string
  time: string
  unread: number
  messages: ChatMessage[]
}

const userConversations: Conversation[] = [
  {
    id: "c1",
    name: "St. Mary's Medical",
    subtitle: "Brooklyn, NY",
    initials: "SM",
    color: "bg-[#087fff]",
    preview: "Congrats! You got the job 🎉",
    time: "2:20Pm",
    unread: 1,
    messages: [{ id: "m1", from: "them", text: "Congrats! You got the job 🎉", time: "2:20 Pm" }],
  },
  {
    id: "c2",
    name: "Riverside General Hospital",
    subtitle: "Austin, TX",
    initials: "RG",
    color: "bg-[#0d8de0]",
    preview: "We'd love to have you on the team!",
    time: "12:20Pm",
    unread: 0,
    messages: [
      { id: "m1", from: "them", text: "We've reviewed your application and we're very impressed with your experience.", time: "12:22 Pm" },
      { id: "m2", from: "them", text: "We'd love to schedule a quick interview. Are you available for a video call?", time: "12:23 Pm" },
      { id: "m3", from: "me", text: "Yes, absolutely! That works perfectly for me.", time: "12:24 Pm" },
      {
        id: "m4",
        from: "them",
        text: "Great! Here is your Google Meet link for the interview - Please join us on Thursday, July 3rd at 2:00 PM:",
        time: "12:25 Pm",
        meetLink: "https://meet.google.com/rwx-kqpz-ybt",
      },
      { id: "m5", from: "me", text: "Thank you so much! I will be there.", time: "12:26 Pm" },
    ],
  },
  {
    id: "c3",
    name: "Summit Care Center",
    subtitle: "Kent, UT",
    initials: "SC",
    color: "bg-[#565656]",
    preview: "Unfortunately, we won't be moving forward.",
    time: "8:00Am",
    unread: 0,
    messages: [{ id: "m1", from: "them", text: "Unfortunately, we won't be moving forward with your application at this time.", time: "8:00 Am" }],
  },
  {
    id: "c4",
    name: "Harbor View Hospital",
    subtitle: "Great Falls, MD",
    initials: "HV",
    color: "bg-[#ff3e66]",
    preview: "Thank you for applying, good luck!",
    time: "1:20Am",
    unread: 0,
    messages: [{ id: "m1", from: "them", text: "Thank you for applying, good luck!", time: "1:20 Am" }],
  },
  {
    id: "c5",
    name: "Greenfield Health",
    subtitle: "Pasadena, OK",
    initials: "GH",
    color: "bg-[#10ad58]",
    preview: "We'll be in touch soon.",
    time: "2:20Pm",
    unread: 2,
    messages: [{ id: "m1", from: "them", text: "We'll be in touch soon.", time: "2:20 Pm" }],
  },
]

const agencyConversations: Conversation[] = [
  {
    id: "a1",
    name: "Amina Boateng",
    subtitle: "Registered Nurse",
    initials: "AB",
    color: "bg-[#ffc95c]",
    preview: "Available for the pediatric home-care opening.",
    time: "2 min ago",
    unread: 1,
    messages: [{ id: "m1", from: "them", text: "I'm available for the pediatric home-care opening whenever you'd like to move forward.", time: "2 min ago" }],
  },
  {
    id: "a2",
    name: "Credentialing Team",
    subtitle: "Internal",
    initials: "CT",
    color: "bg-[#0d8de0]",
    preview: "Three certifications need review.",
    time: "18 min ago",
    unread: 0,
    messages: [
      { id: "m1", from: "them", text: "Three certifications need review before we can approve the Registered Nurse - ICU posting.", time: "18 min ago" },
      { id: "m2", from: "me", text: "Thanks, I'll take a look this afternoon.", time: "16 min ago" },
    ],
  },
  {
    id: "a3",
    name: "Northside Clinic",
    subtitle: "Partner clinic",
    initials: "NC",
    color: "bg-[#10ad58]",
    preview: "Telehealth coverage request approved.",
    time: "1 hr ago",
    unread: 0,
    messages: [{ id: "m1", from: "them", text: "Your telehealth coverage request has been approved for next week.", time: "1 hr ago" }],
  },
]

function MessagesSkeleton() {
  return (
    <div className="flex h-[calc(100vh-72px)] gap-4 p-5 sm:p-8">
      <div className="w-full max-w-sm space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
      <Skeleton className="hidden flex-1 rounded-xl sm:block" />
    </div>
  )
}

export default function MessagesPage() {
  const { flow } = useCareFlow()
  const isLoading = useDelayedLoading()
  const seedConversations = flow === "agency" ? agencyConversations : userConversations

  const [conversations, setConversations] = useState(seedConversations)
  const [selectedId, setSelectedId] = useState(seedConversations[1]?.id ?? seedConversations[0].id)

  if (isLoading) return <MessagesSkeleton />

  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? conversations[0]

  const selectConversation = (id: string) => {
    setSelectedId(id)
    setConversations((current) => current.map((conversation) => (conversation.id === id ? { ...conversation, unread: 0 } : conversation)))
  }

  const sendMessage = (text: string) => {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === selectedId
          ? { ...conversation, messages: [...conversation.messages, { id: `${Date.now()}`, from: "me", text, time: "Now" }] }
          : conversation
      )
    )
  }

  return (
    <div className="animate-fade-in-up flex h-[calc(100vh-72px)] flex-col lg:flex-row">
      <aside className="w-full lg:max-w-sm shrink-0 space-y-1 overflow-y-auto border-b border-[#eef1f3] p-4 lg:border-b-0 lg:border-r">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]" />
          <Input placeholder="Search here" className="pl-9" />
        </div>

        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            type="button"
            onClick={() => selectConversation(conversation.id)}
            className={cn(
              "flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors",
              conversation.id === selectedId ? "bg-[#f2f6f8]" : "hover:bg-[#f7f9fa]"
            )}
          >
            <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white", conversation.color)}>
              {conversation.initials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-bold">{conversation.name}</p>
                <span className="shrink-0 text-xs text-[#8a8f98]">{conversation.time}</span>
              </div>
              <p className="mt-1 truncate text-sm text-[#657080]">{conversation.preview}</p>
            </div>
            {conversation.unread > 0 && (
              <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#087fff] text-xs font-semibold text-white">
                {conversation.unread}
              </span>
            )}
          </button>
        ))}
      </aside>

      <main className="flex-1 min-h-0">
        <ChatThread
          messages={selected.messages}
          onSend={sendMessage}
          className="h-full"
          header={
            <header className="flex items-center justify-between border-b border-[#eef1f3] p-4">
              <div className="flex items-center gap-3">
                <span className={cn("flex size-10 items-center justify-center rounded-full text-sm font-bold text-white", selected.color)}>
                  {selected.initials}
                </span>
                <div>
                  <p className="font-bold">{selected.name}</p>
                  <p className="text-sm text-[#657080]">{selected.subtitle}</p>
                </div>
              </div>
              <button type="button" aria-label="More options" className="flex size-9 items-center justify-center rounded-full transition hover:bg-[#f2f6f8]">
                <MoreHorizontal className="size-5" />
              </button>
            </header>
          }
        />
      </main>
    </div>
  )
}
