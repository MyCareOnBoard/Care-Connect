import { cn } from "@/lib/utils"

/**
 * A loading placeholder. A soft light sweeps across it (see .skeleton-shimmer in index.css)
 * rather than the whole block pulsing — it reads as "arriving" rather than "blinking".
 */
function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("skeleton-shimmer rounded-md bg-black/10", className)}
            {...props}
        />
    )
}

export { Skeleton }
