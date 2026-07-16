import { useRef, useState } from "react"
import { Image, PlaySquare, Send, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar } from "@/components/app/DashboardAvatar"
import { cn, getInitials } from "@/lib/utils"
import { useAuthUser } from "@/utils/auth"

export function PostComposer() {
  const { user } = useAuthUser()
  const [text, setText] = useState("")
  const [image, setImage] = useState<File | null>(null)
  const [video, setVideo] = useState<File | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const canPost = text.trim().length > 0 || !!image || !!video

  const handlePost = () => {
    if (!canPost) return
    toast.success("Post shared!")
    setText("")
    setImage(null)
    setVideo(null)
  }

  return (
    <section className="rounded-[30px] border border-white/60 bg-white/80 px-4 py-4 shadow-[0_8px_28px_rgba(16,20,26,0.06)] backdrop-blur-md">
      <div className="flex items-start gap-4">
        <Avatar className="mt-0.5 border border-[#d8d8d8] bg-[#087fff]" initials={getInitials(user?.fullName)} />
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Share some highlights"
          rows={1}
          className="min-h-13.5 flex-1 resize-none rounded-2xl border-[#d6d6d6] bg-white/70 px-4 py-3.5 text-sm text-[#20242c] shadow-none transition-colors duration-200 focus-visible:border-[#087fff] focus-visible:ring-[#087fff]/20"
        />
      </div>

      {(image || video) && (
        <div className="mt-3 flex flex-wrap gap-2 pl-16">
          {image && (
            <span className="flex items-center gap-2 rounded-lg bg-[#ffdfe8] px-3 py-1.5 text-sm text-[#ff3e66]">
              <Image className="size-4" />
              <span className="max-w-40 truncate">{image.name}</span>
              <button type="button" onClick={() => setImage(null)} aria-label="Remove image">
                <X className="size-3.5" />
              </button>
            </span>
          )}
          {video && (
            <span className="flex items-center gap-2 rounded-lg bg-[#ddf3ff] px-3 py-1.5 text-sm text-[#149bdd]">
              <PlaySquare className="size-4" />
              <span className="max-w-40 truncate">{video.name}</span>
              <button type="button" onClick={() => setVideo(null)} aria-label="Remove video">
                <X className="size-3.5" />
              </button>
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pl-17">
        <div className="flex gap-2">
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
        </div>
        <Button
          type="button"
          disabled={!canPost}
          onClick={handlePost}
          className={cn(
            "h-10 rounded-lg px-3 text-white transition-all duration-200",
            canPost
              ? "bg-linear-to-r from-[#087fff] to-[#3d9bff] shadow-[0_4px_14px_rgba(8,127,255,0.35)] hover:scale-105 hover:shadow-[0_6px_18px_rgba(8,127,255,0.45)] active:scale-95"
              : "bg-[#d8d8d8] opacity-100"
          )}
        >
          Post <Send className="size-4" />
        </Button>
      </div>
    </section>
  )
}
