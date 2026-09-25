import { useState } from "react"

/**
 * A round avatar: the person's photo when there is one, their initials on a colour when not.
 *
 * Falls back to initials if the photo fails to load, rather than leaving a broken image in
 * a circle.
 */
export function Avatar({
  className = "",
  initials = "",
  src,
  alt = "",
}: {
  className?: string
  initials?: string
  src?: string | null
  alt?: string
}) {
  const [failed, setFailed] = useState(false)
  const showPhoto = Boolean(src) && !failed

  return (
    <span
      className={`flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-[0_2px_8px_rgba(16,20,26,0.12)] ring-2 ring-white transition-transform duration-200 hover:scale-105 ${className || "bg-[#e8f1f7]"}`}
    >
      {showPhoto ? (
        <img
          src={src ?? undefined}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <span className="text-xs font-bold text-white">{initials}</span>
      )}
    </span>
  )
}
