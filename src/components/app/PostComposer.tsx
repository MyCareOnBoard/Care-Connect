import { useEffect, useMemo, useRef, useState } from "react"
import { Check, Image, Loader2, PartyPopper, Play, PlaySquare, Send, X } from "lucide-react"
import { useSearchParams } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar } from "@/components/app/DashboardAvatar"
import { avatarColor } from "@/components/app/avatarColor"
import { COMPOSE_EVENT, type ComposeDetail } from "@/components/app/composeEvent"
import { EmojiPicker } from "@/components/app/EmojiPicker"
import { CowryIcon } from "@/components/cowry/CowryIcon"
import { encodeMentions, mentionQueryAt, type MentionPick } from "@/components/profile/mentions"
import { haptic } from "@/lib/haptics"
import { playSound } from "@/lib/sound"
import { cn, getInitials } from "@/lib/utils"
import { getAuthErrorMessage, useAuthUser } from "@/utils/auth"
import { formatCowries } from "@/utils/careconnect/cowry"
import { createPost, POST_CREATED_EVENT } from "@/utils/careconnect/services/postsService"
import { listProfiles } from "@/utils/careconnect/services/profilesService"
import type { CareConnectProfile } from "@/utils/careconnect/types"

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
  "Got a tip for new careers?",
  "Earned a certification? Tell everyone",
  "What's one thing that made your day?",
]
const PROMPT_MS = 4000

const CELEBRATE_STARTER = "🎉 Celebrating: "

/** How long after the last keystroke the draft is saved. */
const DRAFT_SAVE_MS = 500
const draftKey = (uid: string) => `careconnect-post-draft:${uid}`

const MENTION_DEBOUNCE_MS = 200
const MENTION_LIMIT = 6

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

/** A picked photo or video, shown as a thumbnail before posting. */
function MediaPreview({
  file,
  kind,
  onRemove,
  onReplace,
}: {
  file: File
  kind: "image" | "video"
  onRemove: () => void
  onReplace: () => void
}) {
  const url = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(url), [url])

  return (
    <div className="animate-cowry-pop group relative size-24 overflow-hidden rounded-2xl bg-[#eef1f3] ring-1 ring-[#e2e6ea] sm:size-28">
      {kind === "image" ? (
        <img src={url} alt="" className="object-cover size-full" />
      ) : (
        <>
          <video src={url} muted playsInline preload="metadata" className="object-cover size-full" />
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
            <span className="flex items-center justify-center text-white rounded-full size-8 bg-black/55">
              <Play className="size-4 fill-white" />
            </span>
          </span>
        </>
      )}
      {/* Tap the thumbnail to pick a different one. */}
      <button
        type="button"
        onClick={onReplace}
        className="absolute inset-x-0 bottom-0 bg-black/55 py-1 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
      >
        Replace
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={kind === "image" ? "Remove photo" : "Remove video"}
        className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}

export function PostComposer({ photo, cowryReward = 0 }: PostComposerProps = {}) {
  const { user } = useAuthUser()
  const uid = user?.uid
  const [text, setText] = useState("")
  const [image, setImage] = useState<File | null>(null)
  const [video, setVideo] = useState<File | null>(null)
  const [posting, setPosting] = useState(false)
  /** 0–1 while media uploads; null when there is nothing uploading. */
  const [progress, setProgress] = useState<number | null>(null)
  const [focused, setFocused] = useState(false)
  const [promptIndex, setPromptIndex] = useState(0)
  const [draftSaved, setDraftSaved] = useState(false)

  // @mentions: who was picked, and the suggestions for what is being typed now.
  const [picks, setPicks] = useState<MentionPick[]>([])
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null)
  const [suggestions, setSuggestions] = useState<CareConnectProfile[]>([])
  const [activeSuggestion, setActiveSuggestion] = useState(0)

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

  /* ── drafts ─────────────────────────────────────────────────────────────
     Unfinished text survives leaving the page or a refresh. Per member, in this browser;
     photos and videos are not kept (files cannot be stored like text). */
  useEffect(() => {
    if (!uid) return
    try {
      const saved = localStorage.getItem(draftKey(uid))
      if (saved) setText((current) => current || saved)
    } catch {
      // No storage: drafts simply are not kept.
    }
  }, [uid])

  useEffect(() => {
    if (!uid) return
    setDraftSaved(false)
    const timer = setTimeout(() => {
      try {
        if (text.trim()) {
          localStorage.setItem(draftKey(uid), text)
          setDraftSaved(true)
        } else {
          localStorage.removeItem(draftKey(uid))
        }
      } catch {
        // Not saved; nothing else depends on it.
      }
    }, DRAFT_SAVE_MS)
    return () => clearTimeout(timer)
  }, [text, uid])

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

  // Arrived via the tab bar's + from another page: open straight into writing, then tidy
  // the address so a refresh does not reopen it.
  const [searchParams, setSearchParams] = useSearchParams()
  const composeRequested = searchParams.get("compose") === "1"
  useEffect(() => {
    if (!composeRequested) return
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.delete("compose")
        return next
      },
      { replace: true },
    )
    // After the page has painted, so the scroll lands on the composer in its final place.
    const timer = setTimeout(() => window.dispatchEvent(new CustomEvent(COMPOSE_EVENT, { detail: {} })), 150)
    return () => clearTimeout(timer)
  }, [composeRequested, setSearchParams])

  /* ── @mentions ────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!mention || mention.query.trim().length < 1) {
      setSuggestions([])
      return
    }
    let active = true
    const timer = setTimeout(async () => {
      try {
        const found = await listProfiles({ search: mention.query.trim(), limit: MENTION_LIMIT })
        if (active) {
          setSuggestions(found.filter((profile) => profile.uid !== uid).slice(0, MENTION_LIMIT))
          setActiveSuggestion(0)
        }
      } catch {
        if (active) setSuggestions([])
      }
    }, MENTION_DEBOUNCE_MS)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [mention, uid])

  const trackMention = (value: string, caret: number) => setMention(mentionQueryAt(value, caret))

  const pickMention = (profile: CareConnectProfile) => {
    const box = textareaRef.current
    if (!box || !mention) return
    const name = profile.name || "Member"
    const caret = box.selectionStart ?? text.length
    const next = `${text.slice(0, mention.start)}@${name} ${text.slice(caret)}`
    setText(next)
    setPicks((current) => [...current.filter((pick) => pick.uid !== profile.uid), { uid: profile.uid, name }])
    setMention(null)
    setSuggestions([])
    const position = mention.start + name.length + 2
    requestAnimationFrame(() => {
      box.focus()
      box.setSelectionRange(position, position)
    })
  }

  /** Put text in at the caret — an emoji, for instance — rather than at the end. */
  const insertAtCaret = (insert: string) => {
    const box = textareaRef.current
    const start = box?.selectionStart ?? text.length
    const end = box?.selectionEnd ?? text.length
    setText(`${text.slice(0, start)}${insert}${text.slice(end)}`)
    requestAnimationFrame(() => {
      box?.focus()
      box?.setSelectionRange(start + insert.length, start + insert.length)
    })
  }

  const startCelebration = () => {
    setText((current) => (current.startsWith(CELEBRATE_STARTER) ? current : `${CELEBRATE_STARTER}${current}`))
    textareaRef.current?.focus()
  }

  const handlePost = async () => {
    if (!canPost || posting) return
    setPosting(true)
    const hasMedia = Boolean(image || video)
    setProgress(hasMedia ? 0 : null)
    try {
      // Names picked from the suggestions become mention tokens; see mentions.ts.
      const statement = encodeMentions(
        text.trim(),
        picks.filter((pick) => text.includes(`@${pick.name}`)),
      )
      const post = await createPost({ statement, media: [image, video] }, hasMedia ? setProgress : undefined)
      window.dispatchEvent(new CustomEvent(POST_CREATED_EVENT, { detail: post }))
      haptic("success")
      playSound("success")
      toast.success("Post shared!")
      setText("")
      setImage(null)
      setVideo(null)
      setPicks([])
      try {
        if (uid) localStorage.removeItem(draftKey(uid))
      } catch {
        // Nothing to clean up.
      }
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setPosting(false)
      setProgress(null)
    }
  }

  const uploading = progress !== null && progress < 1
  const suggestionsOpen = focused && mention !== null && suggestions.length > 0

  return (
    <section
      ref={sectionRef}
      data-tour="compose"
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
        <div className="relative flex-1 min-w-0">
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => {
              setText(event.target.value)
              trackMention(event.target.value, event.target.selectionStart ?? event.target.value.length)
            }}
            onClick={(event) => trackMention(text, event.currentTarget.selectionStart ?? text.length)}
            onKeyDown={(event) => {
              if (!suggestionsOpen) return
              if (event.key === "ArrowDown") {
                event.preventDefault()
                setActiveSuggestion((i) => (i + 1) % suggestions.length)
              } else if (event.key === "ArrowUp") {
                event.preventDefault()
                setActiveSuggestion((i) => (i - 1 + suggestions.length) % suggestions.length)
              } else if (event.key === "Enter" || event.key === "Tab") {
                event.preventDefault()
                pickMention(suggestions[activeSuggestion])
              } else if (event.key === "Escape") {
                setMention(null)
              }
            }}
            onFocus={() => setFocused(true)}
            // A beat later, so tapping a suggestion registers before the list closes.
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            disabled={posting}
            aria-label="Write a post"
            aria-autocomplete="list"
            aria-expanded={suggestionsOpen}
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

          {/* People to mention, as you type @name. */}
          {suggestionsOpen && (
            <ul
              role="listbox"
              aria-label="People to mention"
              className="animate-fadeIn absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-2xl bg-white p-1 shadow-[0_18px_40px_-16px_rgba(16,20,26,0.45)] ring-1 ring-[#e2e6ea]"
            >
              {suggestions.map((profile, index) => (
                <li key={profile.uid} role="option" aria-selected={index === activeSuggestion}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveSuggestion(index)}
                    onClick={() => pickMention(profile)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors",
                      index === activeSuggestion ? "bg-[#e3f8f8]" : "hover:bg-[#f7f9fb]",
                    )}
                  >
                    <Avatar
                      className={cn("size-8 ring-0 shadow-none", avatarColor(profile.uid))}
                      initials={getInitials(profile.name)}
                      src={profile.photo}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[#151922]">{profile.name}</span>
                      {profile.subtitle && <span className="block truncate text-xs text-[#657080]">{profile.subtitle}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {(image || video) && (
        <div className="flex flex-wrap gap-2 mt-3 pl-15 sm:pl-16">
          {image && (
            <MediaPreview
              file={image}
              kind="image"
              onRemove={() => setImage(null)}
              onReplace={() => imageInputRef.current?.click()}
            />
          )}
          {video && (
            <MediaPreview
              file={video}
              kind="video"
              onRemove={() => setVideo(null)}
              onReplace={() => videoInputRef.current?.click()}
            />
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 sm:pl-16">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              setImage(event.target.files?.[0] ?? null)
              // Cleared, so choosing the same file again still counts as a change.
              event.target.value = ""
            }}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(event) => {
              setVideo(event.target.files?.[0] ?? null)
              event.target.value = ""
            }}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="flex h-6 items-center gap-1 rounded-lg bg-[#ffdfe8] px-2 text-sm text-[#ff3e66] transition-transform duration-150 hover:scale-105 hover:brightness-95 active:scale-95"
          >
            <Image className="size-4" />
            Image
          </button>
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="flex h-6 items-center gap-1 rounded-lg bg-[#ddf3ff] px-2 text-sm text-[#149bdd] transition-transform duration-150 hover:scale-105 hover:brightness-95 active:scale-95"
          >
            <PlaySquare className="size-4" />
            Video
          </button>
          <button
            type="button"
            onClick={startCelebration}
            className="group flex h-6 items-center gap-1 rounded-lg bg-[#fff1d6] px-2 text-sm text-[#c27a12] transition-transform duration-150 hover:scale-105 hover:brightness-95 active:scale-95"
          >
            <PartyPopper className="transition-transform size-4 group-hover:-rotate-12" />
            Celebrate
          </button>
          <EmojiPicker onPick={insertAtCaret} />
          {draftSaved && !posting && (
            <span className="animate-fadeIn inline-flex items-center gap-1 text-xs text-[#8a94a3]">
              <Check className="size-3" aria-hidden="true" />
              Draft saved
            </span>
          )}
        </div>
        <Button
          type="button"
          disabled={!canPost || posting}
          onClick={handlePost}
          aria-busy={posting}
          className={cn(
            "relative h-10 overflow-hidden rounded-lg px-3 text-white transition-all duration-200",
            // Keep full colour while posting: a greyed-out button reads as "can't", not "working".
            posting
              ? "bg-linear-to-r from-[#00b4b8] to-[#2dd4d8] disabled:opacity-100 cursor-progress"
              : canPost
              ? "bg-linear-to-r from-[#00b4b8] to-[#2dd4d8] shadow-[0_4px_14px_rgba(0,180,184,0.35)] hover:scale-105 hover:shadow-[0_6px_18px_rgba(0,180,184,0.45)] active:scale-95"
              : "bg-[#d8d8d8] opacity-100"
          )}
        >
          {/* Upload progress fills the button from the left while media is on its way. */}
          {uploading && (
            <span
              className="absolute inset-y-0 left-0 bg-white/25 transition-[width] duration-200"
              style={{ width: `${Math.round((progress ?? 0) * 100)}%` }}
              aria-hidden="true"
            />
          )}
          <span className="relative inline-flex items-center gap-2">
            {posting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {uploading ? `Uploading ${Math.round((progress ?? 0) * 100)}%` : "Posting…"}
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
          </span>
        </Button>
      </div>
    </section>
  )
}
