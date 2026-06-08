import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"

import { cn } from "@/lib/utils"

/**
 * ScrollArea component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <ScrollArea className="h-32 w-64 rounded-lg border">
 *       <div className="space-y-2 p-3">
 *         {Array.from({ length: 12 }).map((_, i) => (
 *           <div key={i} className="text-sm">
 *             List item {i + 1}
 *           </div>
 *         ))}
 *       </div>
 *       <ScrollBar orientation="vertical" />
 *     </ScrollArea>
 * ```
 */
function ScrollArea({
  className,
  children,
  ...props
}: ScrollAreaPrimitive.Root.Props) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

/**
 * ScrollBar component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <ScrollArea className="h-32 w-64 rounded-lg border">
 *       <div className="space-y-2 p-3">
 *         {Array.from({ length: 12 }).map((_, i) => (
 *           <div key={i} className="text-sm">
 *             List item {i + 1}
 *           </div>
 *         ))}
 *       </div>
 *       <ScrollBar orientation="vertical" />
 *     </ScrollArea>
 * ```
 */
function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent flex touch-none p-px transition-colors select-none",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="rounded-full bg-border relative flex-1"
      />
    </ScrollAreaPrimitive.Scrollbar>
  )
}
/**
 * Props for ScrollArea.
 *
 * @example
 * ```tsx
 * <ScrollArea className="h-32 w-64 rounded-lg border">
 *       <div className="space-y-2 p-3">
 *         {Array.from({ length: 12 }).map((_, i) => (
 *           <div key={i} className="text-sm">
 *             List item {i + 1}
 *           </div>
 *         ))}
 *       </div>
 *       <ScrollBar orientation="vertical" />
 *     </ScrollArea>
 * ```
 */
export type ScrollAreaProps = React.ComponentProps<typeof ScrollArea>

/**
 * Props for ScrollBar.
 *
 * @example
 * ```tsx
 * <ScrollArea className="h-32 w-64 rounded-lg border">
 *       <div className="space-y-2 p-3">
 *         {Array.from({ length: 12 }).map((_, i) => (
 *           <div key={i} className="text-sm">
 *             List item {i + 1}
 *           </div>
 *         ))}
 *       </div>
 *       <ScrollBar orientation="vertical" />
 *     </ScrollArea>
 * ```
 */
export type ScrollBarProps = React.ComponentProps<typeof ScrollBar>


export { ScrollArea, ScrollBar }
