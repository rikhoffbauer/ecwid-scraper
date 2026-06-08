import { Separator as SeparatorPrimitive } from "@base-ui/react/separator"

import { cn } from "@/lib/utils"
import type * as React from "react"

/**
 * Separator component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <div className="w-64">
 *       <div className="text-sm">Section A</div>
 *       <Separator className="my-2" />
 *       <div className="text-sm">Section B</div>
 *     </div>
 * ```
 */
function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px data-[orientation=vertical]:self-stretch",
        className
      )}
      {...props}
    />
  )
}
/**
 * Props for Separator.
 *
 * @example
 * ```tsx
 * <div className="w-64">
 *       <div className="text-sm">Section A</div>
 *       <Separator className="my-2" />
 *       <div className="text-sm">Section B</div>
 *     </div>
 * ```
 */
export type SeparatorProps = React.ComponentProps<typeof Separator>


export { Separator }