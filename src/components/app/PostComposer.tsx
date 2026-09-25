import { useEffect, useRef, useState } from "react"
import { Image, Loader2, PartyPopper, PlaySquare, Send, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar } from "@/components/app/DashboardAvatar"
import { avatarColor } from "@/components/app/avatarColor"
import { COMPOSE_EVENT, type ComposeDetail } from "@/components/app/composeEvent"
import { CowryIcon } from "@/components/cowry/CowryIcon"
import { cn, getInitials } from "@/lib/utils"
import { getAuthErrorMessage, useAuthUser } from "@/utils/auth"
import { formatCowries } from "@/utils/careconnect/cowry"
import { createPost, POST_CREATED_EVENT } from "@/utils/careconnect/services/postsService"

/**
 * Prompts that rotate in the empty box.
 *
 * "Share some highlights" asked people to decide what counted as a highlight. A concrete
 * question is easier to answer, and a different one each few seconds makes the box feel
 * like it is talking to you.
 */
const PROMPTS = [
  "What did you learn on shift today?",
  "Share a win, big or small",
  "Got a tip for new carers?",
  "Earned a certification? Tell everyone",
  "What's one thing that made your day?",
]
const PROMPT_MS = 4000

const CELEBRATE_STARTER = "🎉 Celebrating: "

interface PostComposerProps {
  /** The author's photo, when the page has it. Initials are the fallback. */
  photo?: string | null
  /**
   * Cowries a post earns right now. Shown on the Post button so the reward is visible at the
   * moment of writing. Omit (or pass 0) when posting does not pay — agencies, a used-up daily
   * allowance — and the pill simply is not there.
   */
  cowryReward?: number
}

export function PostComposer({ photo, cowryReward = 0 }: PostComposerProps = {}) {
  const { user } = useAuthUser()
  const [text, setText] = useState("")
  const [image, setImage] = useState<File | null>(null)
  const [video, setVideo] = useState<File | null>(null)
  const [posting, setPosting] = useState(false)
  const [focused, setFocused] = useState(false)
  const [promptIndex, setPromptIndex] = useState(0)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sectionRef = useRef<HTMLElement>(null)

  // A post needs text (the backend requires a statement); media is optional.
  const canPost = text.trim().length > 0

  // Rotate the prompt only while the box is empty and idle — changing the placeholder
  // under someone who has clicked in to type would be a distraction.
  useEffect(() => {
    if (text || focused) return
    const timer = setInterval(() => setPromptIndex((i) => (i + 1) % PROMPTS.length), PROMPT_MS)
    return () => clearInterval(timer)
  }, [text, focused])

  // Shortcuts elsewhere on the page ("Introduce yourself") open the composer with a starter.
  useEffect(() => {
    const onCompose = (event: Event) => {
      const detail = (event as CustomEvent<ComposeDetail>).detail ?? {}
      // Never overwrite a draft someone has already typed.
      setText((current) => (current.trim() ? current : detail.text ?? current))
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      setTimeout(() => {
        const box = textareaRef.current
        if (!box) return
        box.focus()
        box.setSelectionRange(box.value.length, box.value.length)
      }, 300)
    }
    window.addEventListener(COMPOSE_EVENT, onCompose)
    return () => window.removeEventListener(COMPOSE_EVENT, onCompose)
  }, [])

  const startCelebration = () => {
    setText((current) => (current.startsWith(CELEBRATE_STARTER) ? current : `${CELEBRATE_STARTER}${current}`))
    textareaRef.current?.focus()
  }

  const handlePost = async () => {
    if (!canPost || posting) return
    setPosting(true)
    try {
      const post = await createPost({ statement: text.trim(), media: [image, video] })
      window.dispatchEvent(new CustomEvent(POST_CREATED_EVENT, { detail: post }))
      toast.success("Post shared!")
      setText("")
      setImage(null)
      setVideo(null)
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setPosting(false)
    }
  }

  return (
    <section
      ref={sectionRef}
      className={cn(
        "rounded-[30px] border bg-white/85 px-4 py-4 shadow-[0_8px_28px_rgba(16,20,26,0.06)] backdrop-blur-md transition-all duration-300",
        focused || canPost
          ? "border-[#00b4b8]/40 shadow-[0_14px_40px_-14px_rgba(0,180,184,0.45)]"
          : "border-white/60",
      )}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <Avatar
          className={cn("mt-0.5 border border-[#d8d8d8]", avatarColor(user?.uid))}
          initials={getInitials(user?.fullName)}
          src={photo ?? user?.photoURL}
          alt={user?.fullName ?? ""}
        />
        <div className="relative min-w-0 flex-1">
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={posting}
            aria-label="Write a post"
            rows={focused || text ? 3 : 1}
            className="min-h-13.5 w-full resize-none rounded-2xl border-[#d6d6d6] bg-white/70 px-4 py-3.5 text-sm text-[#20242c] shadow-none transition-all duration-200 focus-visible:border-[#00b4b8] focus-visible:ring-[#00b4b8]/20"
          />
          {/* The prompt, drawn over the empty box so it can fade between questions — a
              native placeholder cannot animate. */}
          {!text && (
            <span
              key={promptIndex}
              className="animate-fade-in-up pointer-events-none absolute left-4 top-3.5 right-4 truncate text-sm text-[#9aa4b2]"
              aria-hidden="true"
            >
              {PROMPTS[promptIndex]}
            </span>
          )}
        </div>
      </div>

      {(image || video) && (
        <div className="mt-3 flex flex-wrap gap-2 pl-15 sm:pl-16">
          {image && (
            <span className="animate-fadeIn flex items-center gap-2 rounded-lg bg-[#ffdfe8] px-3 py-1.5 text-sm text-[#ff3e66]">
              <Image className="size-4" />
              <span className="max-w-40 truncate">{image.name}</span>
              <button type="button" onClick={() => setImage(null)} aria-label="Remove image">
                <X className="size-3.5" />
              </button>
            </span>
          )}
          {video && (
            <span className="animate-fadeIn flex items-center gap-2 rounded-lg bg-[#ddf3ff] px-3 py-1.5 text-sm text-[#149bdd]">
              <PlaySquare className="size-4" />
              <span className="max-w-40 truncate">{video.name}</span>
              <button type="button" onClick={() => setVideo(null)} aria-label="Remove video">
                <X className="size-3.5" />
              </button>
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 sm:pl-16">
        <div className="flex flex-wrap gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => setImage(event.target.files?.[0] ?? null)}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(event) => setVideo(event.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="flex h-8 items-center gap-1 rounded-lg bg-[#ffdfe8] px-2 text-sm text-[#ff3e66] transition-transform duration-150 hover:scale-105 hover:brightness-95 active:scale-95"
          >
            <Image className="size-5" />
            Image
          </button>
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="flex h-8 items-center gap-1 rounded-lg bg-[#ddf3ff] px-2 text-sm text-[#149bdd] transition-transform duration-150 hover:scale-105 hover:brightness-95 active:scale-95"
          >
            <PlaySquare className="size-5" />
            Video
          </button>
          <button
            type="button"
            onClick={startCelebration}
            className="group flex h-8 items-center gap-1 rounded-lg bg-[#fff1d6] px-2 text-sm text-[#c27a12] transition-transform duration-150 hover:scale-105 hover:brightness-95 active:scale-95"
          >
            <PartyPopper className="size-5 transition-transform group-hover:-rotate-12" />
            Celebrate
          </button>
        </div>
        <Button
          type="button"
          disabled={!canPost || posting}
          onClick={handlePost}
          aria-busy={posting}
          className={cn(
            "h-10 rounded-lg px-3 text-white transition-all duration-200",
            // Keep full colour while posting: a greyed-out button reads as "can't", not "working".
            posting
              ? "bg-linear-to-r from-[#00b4b8] to-[#2dd4d8] disabled:opacity-100 cursor-progress"
              : canPost
              ? "bg-linear-to-r from-[#00b4b8] to-[#2dd4d8] shadow-[0_4px_14px_rgba(0,180,184,0.35)] hover:scale-105 hover:shadow-[0_6px_18px_rgba(0,180,184,0.45)] active:scale-95"
              : "bg-[#d8d8d8] opacity-100"
          )}
        >
          {posting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Posting…
            </>
          ) : (
            <>
              Post <Send className="size-4" />
            </>
          )}
          {cowryReward > 0 && !posting && (
            // What this post will earn, on the button that earns it.
            <span className="cowry-hover ml-1 inline-flex items-center gap-0.5 rounded-full bg-white/95 px-1.5 py-0.5 text-xs font-bold text-[#7a5310]">
              <CowryIcon size={14} className={cn(canPost && "cowry-wobble")} />+{formatCowries(cowryReward)}
            </span>
          )}
        </Button>
      </div>
    </section>
  )
}
