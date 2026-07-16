import { useState, type FormEvent, type ReactNode } from "react"
import { Mic, Paperclip, Send } from "lucide-react"
import { cn } from "@/lib/utils"

export type ChatMessage = {
  id: string
  from: "me" | "them"
  text: string
  time: string
  meetLink?: string
}

type ChatThreadProps = {
  messages: ChatMessage[]
  onSend: (text: string) => void
  header?: ReactNode
  className?: string
}

export function ChatThread({ messages, onSend, header, className = "" }: ChatThreadProps) {
  const [draft, setDraft] = useState("")

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
        {messages.map((message) => (
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
                {message.text}
              </div>
            )}
            <span className="mt-1 text-xs text-[#8a8f98]">{message.time}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-[#eef1f3] p-3">
        <button
          type="button"
          aria-label="Voice message"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#e2e2e2] text-[#565656] transition hover:bg-[#f2f6f8]"
        >
          <Mic className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Attach file"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#e2e2e2] text-[#565656] transition hover:bg-[#f2f6f8]"
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
