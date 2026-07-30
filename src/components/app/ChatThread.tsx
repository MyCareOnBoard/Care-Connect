import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import { FileText, Mic, Paperclip, Send } from "lucide-react"
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

function AttachmentView({ attachment }: { attachment: ChatAttachment }) {
  if (attachment.type === "image") {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="mt-1 block">
        <img
          src={attachment.url}
          alt={attachment.name || "attachment"}
          className="max-h-56 max-w-full rounded-xl object-cover shadow-[0_4px_12px_rgba(16,20,26,0.15)]"
        />
      </a>
    )
  }
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 inline-flex items-center gap-2 rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm underline shadow-[0_2px_6px_rgba(16,20,26,0.08)]"
    >
      <FileText className="size-4 shrink-0" />
      <span className="max-w-48 truncate">{attachment.name || "Attachment"}</span>
    </a>
  )
}

export function ChatThread({ messages, onSend, onAttach, header, className = "", emptyLabel = "No messages yet. Say hello 👋" }: ChatThreadProps) {
  const [draft, setDraft] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to the newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
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

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[#8a8f98]">{emptyLabel}</div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={cn("flex flex-col", message.from === "me" ? "items-end" : "items-start")}>
              {message.meetLink ? (
                <div className="max-w-[90%] rounded-2xl bg-[#eafaf1] px-4 py-3 text-sm text-[#0f5132] shadow-[0_4px_14px_rgba(16,20,26,0.08)]">
                  <p>{message.text}</p>
                  <a
                    href={message.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block font-semibold text-[#10ad58] hover:underline"
                  >
                    {message.meetLink}
                  </a>
                </div>
              ) : (
                <div
                  className={cn(
                    "max-w-[90%] rounded-2xl px-4 py-2.5 text-sm transition-shadow duration-200",
                    message.from === "me"
                      ? "bg-linear-to-br from-[#00b4b8] to-[#00898c] text-white shadow-[0_4px_14px_rgba(0,180,184,0.3)]"
                      : "bg-white text-[#20242c] shadow-[0_2px_10px_rgba(16,20,26,0.06)]"
                  )}
                >
                  {message.text && <p className="whitespace-pre-wrap wrap-break-word">{message.text}</p>}
                  {message.attachments?.map((attachment, index) => (
                    <AttachmentView key={`${message.id}-att-${index}`} attachment={attachment} />
                  ))}
                </div>
              )}
              <span className="mt-1 text-xs text-[#8a8f98]">{message.time}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-[#eef1f3] bg-white/70 p-3 shadow-[0_-4px_16px_rgba(16,20,26,0.04)] backdrop-blur-sm">
        <button
          type="button"
          aria-label="Voice message"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#e2e2e2] bg-white text-[#565656] shadow-[0_1px_4px_rgba(16,20,26,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_4px_10px_rgba(16,20,26,0.1)]"
        >
          <Mic className="size-4" />
        </button>
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
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#e2e2e2] bg-white text-[#565656] shadow-[0_1px_4px_rgba(16,20,26,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_4px_10px_rgba(16,20,26,0.1)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[0_1px_4px_rgba(16,20,26,0.04)]"
        >
          <Paperclip className="size-4" />
        </button>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a message here"
          className="h-10 flex-1 rounded-lg border border-transparent bg-[#f2f4f6] px-4 text-sm outline-none placeholder:text-[#8a8f98] transition-shadow duration-200 focus-visible:border-[#00b4b8]/30 focus-visible:bg-white focus-visible:shadow-[0_2px_10px_rgba(16,20,26,0.08)] focus-visible:ring-2 focus-visible:ring-[#00b4b8]/20"
        />
        <button
          type="submit"
          aria-label="Send message"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-[#00b4b8] to-[#00898c] text-white shadow-[0_4px_14px_rgba(0,180,184,0.35)] transition-all duration-200 hover:scale-105 hover:shadow-[0_6px_18px_rgba(0,180,184,0.45)] active:scale-95"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  )
}
