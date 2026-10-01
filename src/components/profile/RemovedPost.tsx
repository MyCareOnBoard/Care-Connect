import { Link } from "react-router"
import { Repeat2, Trash2 } from "lucide-react"

/**
 * A repost of a post that is no longer there.
 *
 * The row is kept rather than dropped, which is a deliberate choice on the backend's part
 * too: a feed that silently shortened itself reads as posts going missing, and the reader
 * has no way to tell that from a bug. Saying the post was removed is the honest version, and
 * it is the whole reason a deleted post leaves a tombstone instead of vanishing.
 *
 * No actions. There is nothing to like, nothing to comment on, and nobody to gift — the only
 * thing left to do with it is undo the repost, which belongs on the reposter's own profile
 * rather than on a card in everyone's feed.
 */
export function RemovedPost({
  reposterName,
  reposterHref,
}: {
  reposterName: string
  reposterHref?: string
}) {
  return (
    <article className="rounded-2xl border border-dashed border-[#d7dde3] bg-white/60 p-5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-[#657080]">
        <Repeat2 className="size-3.5 shrink-0" aria-hidden="true" />
        {reposterHref ? (
          <Link to={reposterHref} className="hover:text-[#00898c] hover:underline">
            {reposterName}
          </Link>
        ) : (
          <span>{reposterName}</span>
        )}
        <span className="font-normal">reposted</span>
      </p>

      <div className="mt-3 flex items-center gap-3 rounded-xl bg-[#f4f6f8] px-4 py-5">
        <Trash2 className="size-5 shrink-0 text-[#8b95a1]" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-[#4f5862]">This post was removed</p>
          <p className="mt-0.5 text-xs text-[#8b95a1]">
            Its author deleted it, so there is nothing left to show here.
          </p>
        </div>
      </div>
    </article>
  )
}
