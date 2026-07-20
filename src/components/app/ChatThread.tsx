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
        <img src={attachment.url} alt={attachment.name || "attachment"} className="max-h-56 max-w-full rounded-xl object-cover" />
      </a>
    )
  }
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 inline-flex items-center gap-2 rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm underline"
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
                <div className="max-w-[90%] rounded-2xl bg-[#eafaf1] px-4 py-3 text-sm text-[#0f5132]">
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
                    "max-w-[90%] rounded-2xl px-4 py-2.5 text-sm",
                    message.from === "me" ? "bg-[#087fff] text-white" : "bg-[#f2f4f6] text-[#20242c]"
                  )}
                >
                  {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}
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

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-[#eef1f3] p-3">
        <button
          type="button"
          aria-label="Voice message"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#e2e2e2] text-[#565656] transition hover:bg-[#f2f6f8]"
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
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#e2e2e2] text-[#565656] transition hover:bg-[#f2f6f8] disabled:opacity-50"
        >
          <Paperclip className="size-4" />
        </button>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a message here"
          className="h-10 flex-1 rounded-lg bg-[#f2f4f6] px-4 text-sm outline-none placeholder:text-[#8a8f98] focus-visible:ring-2 focus-visible:ring-[#087fff]/20"
        />
        <button
          type="submit"
          aria-label="Send message"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#087fff] text-white transition hover:scale-105 active:scale-95"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  )
}
