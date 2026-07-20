import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router"
import { collection, limit as fsLimit, onSnapshot, orderBy, query, where, type DocumentData } from "firebase/firestore"
import { MoreHorizontal, Search } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ChatThread, type ChatMessage } from "@/components/app/ChatThread"
import { db } from "@/lib/firebase"
import { cn, getInitials } from "@/lib/utils"
import { getAuthErrorMessage, useAuthUser } from "@/utils/auth"
import { toDate } from "@/utils/careconnect/types"
import {
  markRead,
  sendMessage,
  startConversation,
  uploadMessageAttachment,
  type CareConnectConversation,
} from "@/utils/careconnect/services/messagesService"

const CONVERSATIONS = "careconnectConversations"
const AVATAR_COLORS = ["bg-[#087fff]", "bg-[#0d8de0]", "bg-[#ffc95c]", "bg-[#a782d8]", "bg-[#10ad58]", "bg-[#ff3e66]"]
const colorFor = (id: string) => AVATAR_COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length]

function formatTime(value: unknown): string {
  const date = toDate(value as never)
  if (!date) return ""
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

/** Map a live conversation doc to the UI shape (participant from denormalized details). */
function mapConversationDoc(id: string, data: DocumentData, myUid: string): CareConnectConversation {
  const participantIds: string[] = data.participantIds || []
  const otherUid = participantIds.find((pid) => pid !== myUid)
  const details = otherUid ? (data.participantDetails || {})[otherUid] : null
  return {
    id,
    participantIds,
    participant: otherUid
      ? { uid: otherUid, name: details?.name || "Care Connect user", photo: details?.photo ?? null, subtitle: details?.subtitle ?? null }
      : null,
    lastMessage: data.lastMessage ?? null,
    lastMessageAt: data.lastMessageAt ?? null,
    unread: (data.unreadCount && data.unreadCount[myUid]) || 0,
  }
}

function MessagesSkeleton() {
  return (
    <div className="flex h-[calc(100vh-72px)] gap-4 p-5 sm:p-8">
      <div className="w-full max-w-sm space-y-3">
        <Skeleton className="w-full h-10" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
      <Skeleton className="flex-1 hidden rounded-xl sm:block" />
    </div>
  )
}

export default function MessagesPage() {
  const { user } = useAuthUser()
  const myUid = user?.uid
  const [searchParams] = useSearchParams()
  const toUid = searchParams.get("to")

  const [conversations, setConversations] = useState<CareConnectConversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const handledToRef = useRef(false)

  const mapMessage = useCallback(
    (id: string, m: DocumentData): ChatMessage => ({
      id,
      from: m.senderId === myUid ? "me" : "them",
      text: m.content || "",
      time: formatTime(m.createdAt),
      attachments: m.attachments,
    }),
    [myUid],
  )

  // Live conversation list (Firestore onSnapshot).
  useEffect(() => {
    if (!myUid) return
    const q = query(
      collection(db, CONVERSATIONS),
      where("participantIds", "array-contains", myUid),
      orderBy("updatedAt", "desc"),
      fsLimit(50),
    )
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => mapConversationDoc(doc.id, doc.data(), myUid))
        setConversations(list)
        setSelectedId((prev) => prev ?? list[0]?.id ?? null)
        setLoading(false)
      },
      (error) => {
        console.error("conversations subscription error:", error)
        setLoading(false)
      },
    )
    return () => unsubscribe()
  }, [myUid])

  // Deep-link: open/create a DM with ?to=<uid> (write via backend; the snapshot then shows it).
  useEffect(() => {
    if (!myUid || !toUid || handledToRef.current) return
    handledToRef.current = true
    ;(async () => {
      try {
        const conv = await startConversation(toUid)
        setSelectedId(conv.id)
      } catch (error) {
        toast.error(getAuthErrorMessage(error))
      }
    })()
  }, [myUid, toUid])

  // Live messages for the selected conversation; mark it read on open.
  useEffect(() => {
    if (!myUid || !selectedId) {
      setMessages([])
      return
    }
    markRead(selectedId).catch(() => undefined)
    const q = query(
      collection(db, CONVERSATIONS, selectedId, "messages"),
      where("participantIds", "array-contains", myUid),
      orderBy("createdAt", "desc"),
      fsLimit(50),
    )
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((doc) => mapMessage(doc.id, doc.data())).reverse()
        setMessages(msgs)
        // A message may have arrived for the open thread — clear its unread.
        markRead(selectedId).catch(() => undefined)
      },
      (error) => console.error("messages subscription error:", error),
    )
    return () => unsubscribe()
  }, [myUid, selectedId, mapMessage])

  if (loading) return <MessagesSkeleton />

  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? null

  const handleSend = async (text: string) => {
    if (!selectedId) return
    try {
      await sendMessage(selectedId, { content: text })
      // Rendered by the messages onSnapshot.
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    }
  }

  const handleAttach = async (file: File) => {
    if (!selectedId) return
    try {
      const url = await uploadMessageAttachment(file)
      const type = file.type.startsWith("image/") ? "image" : "file"
      await sendMessage(selectedId, { attachments: [{ type, url, name: file.name }] })
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    }
  }

  return (
    <div className="animate-fade-in-up flex h-[calc(100vh-72px)] flex-col lg:flex-row p-8">
      <aside className="w-full lg:max-w-sm shrink-0 space-y-1 overflow-y-auto border-b border-[#eef1f3] p-4 lg:border-b-0 lg:border-r">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]" />
          <Input placeholder="Search here" className="pl-9" />
        </div>

        {conversations.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-[#657080]">No conversations yet.</p>
        ) : (
          conversations.map((conversation) => {
            const name = conversation.participant?.name || "Care Connect user"
            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => setSelectedId(conversation.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors",
                  conversation.id === selectedId ? "bg-[#f2f6f8]" : "hover:bg-[#f7f9fa]"
                )}
              >
                <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white", colorFor(conversation.id))}>
                  {getInitials(name)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold truncate">{name}</p>
                    <span className="shrink-0 text-xs text-[#8a8f98]">{formatTime(conversation.lastMessageAt)}</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-[#657080]">{conversation.lastMessage || "No messages yet"}</p>
                </div>
                {conversation.unread > 0 && (
                  <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#087fff] text-xs font-semibold text-white">
                    {conversation.unread}
                  </span>
                )}
              </button>
            )
          })
        )}
      </aside>

      <main className="flex-1 min-h-0">
        {selected ? (
          <ChatThread
            messages={messages}
            onSend={handleSend}
            onAttach={handleAttach}
            className="h-full"
            header={
              <header className="flex items-center justify-between border-b border-[#eef1f3] p-4">
                <div className="flex items-center gap-3">
                  <span className={cn("flex size-10 items-center justify-center rounded-full text-sm font-bold text-white", colorFor(selected.id))}>
                    {getInitials(selected.participant?.name || "?")}
                  </span>
                  <div>
                    <p className="font-bold">{selected.participant?.name || "Care Connect user"}</p>
                    <p className="text-sm text-[#657080]">{selected.participant?.subtitle || ""}</p>
                  </div>
                </div>
                <button type="button" aria-label="More options" className="flex size-9 items-center justify-center rounded-full transition hover:bg-[#f2f6f8]">
                  <MoreHorizontal className="size-5" />
                </button>
              </header>
            }
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[#8a8f98]">
            Select a conversation to start messaging.
          </div>
        )}
      </main>
    </div>
  )
}
