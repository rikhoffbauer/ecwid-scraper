import { cn } from "@/lib/utils"
import type * as React from "react"

/**
 * AspectRatio component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <AspectRatio ratio={16 / 9} className="bg-muted w-80 rounded-lg">
 *       <div className="flex h-full w-full items-center justify-center text-sm">
 *         16:9
 *       </div>
 *     </AspectRatio>
 * ```
 */
function AspectRatio({
  ratio,
  className,
  ...props
}: React.ComponentProps<"div"> & { ratio: number }) {
  return (
    <div
      data-slot="aspect-ratio"
      style={
        {
          "--ratio": ratio,
        } as React.CSSProperties
      }
      className={cn("relative aspect-(--ratio)", className)}
      {...props}
    />
  )
}
/**
 * Props for AspectRatio.
 *
 * @example
 * ```tsx
 * <AspectRatio ratio={16 / 9} className="bg-muted w-80 rounded-lg">
 *       <div className="flex h-full w-full items-center justify-center text-sm">
 *         16:9
 *       </div>
 *     </AspectRatio>
 * ```
 */
export type AspectRatioProps = React.ComponentProps<typeof AspectRatio>


export { AspectRatio }