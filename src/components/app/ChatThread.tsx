import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { FileText, Paperclip, Send, X } from "lucide-react"
import { EmojiPicker } from "@/components/app/EmojiPicker"
import { PostText } from "@/components/profile/PostText"
import { cn } from "@/lib/utils"

export type ChatAttachment = {
  type: "image" | "file"
  url: string
  name?: string
}

export type ChatMessage = {
  id: string
  from: "me" | "them"
  text: string
  time: string
  /** When it was sent. Drives the day separators; messages without it simply skip them. */
  sentAt?: Date | null
  meetLink?: string
  attachments?: ChatAttachment[]
}

type ChatThreadProps = {
  messages: ChatMessage[]
  onSend: (text: string) => void
  /** Optional — when provided, the paperclip opens a file picker and calls this with the chosen file. */
  onAttach?: (file: File) => void
  header?: ReactNode
  className?: string
  emptyLabel?: string
}

/** Messages this close together from the same person read as one run of bubbles. */
const GROUP_GAP_MS = 5 * 60 * 1000

function dayLabel(date: Date): string {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diff = Math.round((startOf(new Date()) - startOf(date)) / 86_400_000)
  if (diff === 0) return "Today"
  if (diff === 1) return "Yesterday"
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}),
  })
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** A photo shown large, over the conversation, instead of in a new tab. */
function PhotoLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return createPortal(
    <div className="animate-fadeIn fixed inset-0 z-50 flex items-center justify-center bg-[#0b0e12]/95 p-4" role="dialog" aria-modal="true" aria-label="Photo">
      <button type="button" className="absolute inset-0" aria-label="Close photo" onClick={onClose} />
      <img src={url} alt="" className="relative max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
      >
        <X className="size-5" aria-hidden="true" />
      </button>
    </div>,
    document.body,
  )
}

function AttachmentView({ attachment, onOpenPhoto }: { attachment: ChatAttachment; onOpenPhoto: (url: string) => void }) {
  if (attachment.type === "image") {
    return (
      <button type="button" onClick={() => onOpenPhoto(attachment.url)} className="mt-1 block overflow-hidden rounded-xl">
        <img
          src={attachment.url}
          alt={attachment.name || "Photo"}
          loading="lazy"
          decoding="async"
          className="max-h-60 max-w-full rounded-xl object-cover transition-transform duration-300 hover:scale-[1.02]"
        />
      </button>
    )
  }
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 inline-flex items-center gap-2 rounded-xl border border-current/20 bg-white/15 px-3 py-2 text-sm font-medium"
    >
      <FileText className="size-4 shrink-0" />
      <span className="max-w-48 truncate underline-offset-2 hover:underline">{attachment.name || "Attachment"}</span>
    </a>
  )
}

export function ChatThread({ messages, onSend, onAttach, header, className = "", emptyLabel = "No messages yet. Say hello 👋" }: ChatThreadProps) {
  const [draft, setDraft] = useState("")
  const [photo, setPhoto] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const firstScroll = useRef(true)

  // Follow the newest message: a jump on first open, a glide after that.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: firstScroll.current ? "auto" : "smooth" })
    if (messages.length) firstScroll.current = false
  }, [messages])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed) return
    onSend(trimmed)
    setDraft("")
  }

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {header}

      <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#f7fafb_0%,#f2f7f8_100%)] px-3 py-4 sm:px-5">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[#8a8f98]">{emptyLabel}</div>
        ) : (
          messages.map((message, index) => {
            const previous = messages[index - 1]
            const next = messages[index + 1]
            const mine = message.from === "me"
            const at = message.sentAt ?? null
            const newDay = at && (!previous?.sentAt || !sameDay(previous.sentAt, at))
            const joinsPrevious =
              !newDay && previous?.from === message.from && at && previous.sentAt && at.getTime() - previous.sentAt.getTime() < GROUP_GAP_MS
            const joinsNext =
              next?.from === message.from &&
              at &&
              next.sentAt &&
              sameDay(next.sentAt, at) &&
              next.sentAt.getTime() - at.getTime() < GROUP_GAP_MS

            return (
              <Fragment key={message.id}>
                {newDay && (
                  <div className="my-4 flex items-center justify-center" role="separator">
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#657080] shadow-[0_1px_4px_rgba(16,20,26,0.08)] ring-1 ring-[#e8edef]">
                      {dayLabel(at)}
                    </span>
                  </div>
                )}
                <div
                  className={cn(
                    "animate-fade-in-up flex flex-col",
                    mine ? "items-end" : "items-start",
                    joinsPrevious ? "mt-0.5" : "mt-3",
                  )}
                >
                  {message.meetLink ? (
                    <div className="max-w-[85%] rounded-2xl bg-[#eafaf1] px-4 py-3 text-sm text-[#0f5132] shadow-[0_4px_14px_rgba(16,20,26,0.08)] ring-1 ring-[#c9eed8]">
                      <p>{message.text}</p>
                      <a
                        href={message.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block break-all font-semibold text-[#10ad58] hover:underline"
                      >
                        {message.meetLink}
                      </a>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "max-w-[85%] px-3.5 py-2 text-sm leading-relaxed",
                        // A run of bubbles shares its edge: only the last in a run keeps the tail corner.
                        mine
                          ? cn(
                              "rounded-2xl bg-linear-to-br from-[#00b4b8] to-[#00898c] text-white shadow-[0_4px_14px_-4px_rgba(0,137,140,0.5)]",
                              joinsPrevious && "rounded-tr-md",
                              joinsNext ? "rounded-br-md" : "rounded-br-sm",
                            )
                          : cn(
                              "rounded-2xl bg-white text-[#20242c] shadow-[0_2px_10px_rgba(16,20,26,0.06)] ring-1 ring-[#eef1f3]",
                              joinsPrevious && "rounded-tl-md",
                              joinsNext ? "rounded-bl-md" : "rounded-bl-sm",
                            ),
                      )}
                    >
                      {message.text && (
                        <PostText
                          text={message.text}
                          className={cn("whitespace-pre-wrap wrap-break-word", mine && "[&_a]:text-white [&_a]:underline")}
                        />
                      )}
                      {message.attachments?.map((attachment, attachmentIndex) => (
                        <AttachmentView
                          key={`${message.id}-att-${attachmentIndex}`}
                          attachment={attachment}
                          onOpenPhoto={setPhoto}
                        />
                      ))}
                    </div>
                  )}
                  {/* The time once per run of bubbles, under the last one. */}
                  {!joinsNext && <span className="mt-1 px-1 text-[11px] text-[#8a8f98]">{message.time}</span>}
                </div>
              </Fragment>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-[#eef1f3] bg-white/80 p-3 shadow-[0_-4px_16px_rgba(16,20,26,0.04)] backdrop-blur-sm">
        {onAttach && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onAttach(file)
              event.target.value = ""
            }}
          />
        )}
        <button
          type="button"
          aria-label="Attach file"
          onClick={() => fileInputRef.current?.click()}
          disabled={!onAttach}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-[#565656] transition hover:bg-[#f2f6f8] active:scale-90 disabled:opacity-50"
        >
          <Paperclip className="size-5" />
        </button>
        <div className="relative flex-1">
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write a message"
            aria-label="Write a message"
            className="h-11 w-full rounded-full border border-transparent bg-[#f2f4f6] pl-4 pr-11 text-sm outline-none placeholder:text-[#8a8f98] transition-shadow duration-200 focus-visible:border-[#00b4b8]/30 focus-visible:bg-white focus-visible:shadow-[0_2px_10px_rgba(16,20,26,0.08)] focus-visible:ring-2 focus-visible:ring-[#00b4b8]/20"
          />
          <EmojiPicker
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full"
            onPick={(emoji) => {
              setDraft((current) => current + emoji)
              inputRef.current?.focus()
            }}
          />
        </div>
        <button
          type="submit"
          aria-label="Send message"
          disabled={!draft.trim()}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#00b4b8] to-[#00898c] text-white shadow-[0_4px_14px_rgba(0,180,184,0.35)] transition-all duration-200 hover:scale-105 hover:shadow-[0_6px_18px_rgba(0,180,184,0.45)] active:scale-95 disabled:scale-100 disabled:opacity-40 disabled:shadow-none"
        >
          <Send className="size-4" />
        </button>
      </form>

      {photo && <PhotoLightbox url={photo} onClose={() => setPhoto(null)} />}
    </div>
  )
}
