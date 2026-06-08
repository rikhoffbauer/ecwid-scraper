import { cn } from "@/lib/utils"
import type * as React from "react"

/**
 * Skeleton component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <div className="space-y-2">
 *       <Skeleton className="h-4 w-40" />
 *       <Skeleton className="h-4 w-56" />
 *       <Skeleton className="h-4 w-48" />
 *     </div>
 * ```
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-muted rounded-md animate-pulse", className)}
      {...props}
    />
  )
}
/**
 * Props for Skeleton.
 *
 * @example
 * ```tsx
 * <div className="space-y-2">
 *       <Skeleton className="h-4 w-40" />
 *       <Skeleton className="h-4 w-56" />
 *       <Skeleton className="h-4 w-48" />
 *     </div>
 * ```
 */
export type SkeletonProps = React.ComponentProps<typeof Skeleton>


export { Skeleton }