"use client"

import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card"

import { cn } from "@/lib/utils"
import type * as React from "react"

/**
 * HoverCard component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <HoverCard>
 *       <HoverCardTrigger render={<Button variant="outline" />}>
 *         Hover me
 *       </HoverCardTrigger>
 *       <HoverCardContent className="w-64">
 *         <div className="space-y-1">
 *           <p className="text-sm font-medium">@studio</p>
 *           <p className="text-sm text-muted-foreground">
 *             We build cohesive design systems for fast-moving teams.
 *           </p>
 *         </div>
 *       </HoverCardContent>
 *     </HoverCard>
 * ```
 */
function HoverCard({ ...props }: PreviewCardPrimitive.Root.Props) {
  return <PreviewCardPrimitive.Root data-slot="hover-card" {...props} />
}

/**
 * HoverCardTrigger component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <HoverCard>
 *       <HoverCardTrigger render={<Button variant="outline" />}>
 *         Hover me
 *       </HoverCardTrigger>
 *       <HoverCardContent className="w-64">
 *         <div className="space-y-1">
 *           <p className="text-sm font-medium">@studio</p>
 *           <p className="text-sm text-muted-foreground">
 *             We build cohesive design systems for fast-moving teams.
 *           </p>
 *         </div>
 *       </HoverCardContent>
 *     </HoverCard>
 * ```
 */
function HoverCardTrigger({ ...props }: PreviewCardPrimitive.Trigger.Props) {
  return (
    <PreviewCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
  )
}

/**
 * HoverCardContent component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <HoverCard>
 *       <HoverCardTrigger render={<Button variant="outline" />}>
 *         Hover me
 *       </HoverCardTrigger>
 *       <HoverCardContent className="w-64">
 *         <div className="space-y-1">
 *           <p className="text-sm font-medium">@studio</p>
 *           <p className="text-sm text-muted-foreground">
 *             We build cohesive design systems for fast-moving teams.
 *           </p>
 *         </div>
 *       </HoverCardContent>
 *     </HoverCard>
 * ```
 */
function HoverCardContent({
  className,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 4,
  ...props
}: PreviewCardPrimitive.Popup.Props &
  Pick<
    PreviewCardPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <PreviewCardPrimitive.Portal data-slot="hover-card-portal">
      <PreviewCardPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <PreviewCardPrimitive.Popup
          data-slot="hover-card-content"
          className={cn(
            "data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground w-64 rounded-lg p-2.5 text-sm shadow-md ring-1 duration-100 z-50 origin-(--transform-origin) outline-hidden",
            className
          )}
          {...props}
        />
      </PreviewCardPrimitive.Positioner>
    </PreviewCardPrimitive.Portal>
  )
}
/**
 * Props for HoverCard.
 *
 * @example
 * ```tsx
 * <HoverCard>
 *       <HoverCardTrigger render={<Button variant="outline" />}>
 *         Hover me
 *       </HoverCardTrigger>
 *       <HoverCardContent className="w-64">
 *         <div className="space-y-1">
 *           <p className="text-sm font-medium">@studio</p>
 *           <p className="text-sm text-muted-foreground">
 *             We build cohesive design systems for fast-moving teams.
 *           </p>
 *         </div>
 *       </HoverCardContent>
 *     </HoverCard>
 * ```
 */
export type HoverCardProps = React.ComponentProps<typeof HoverCard>

/**
 * Props for HoverCardTrigger.
 *
 * @example
 * ```tsx
 * <HoverCard>
 *       <HoverCardTrigger render={<Button variant="outline" />}>
 *         Hover me
 *       </HoverCardTrigger>
 *       <HoverCardContent className="w-64">
 *         <div className="space-y-1">
 *           <p className="text-sm font-medium">@studio</p>
 *           <p className="text-sm text-muted-foreground">
 *             We build cohesive design systems for fast-moving teams.
 *           </p>
 *         </div>
 *       </HoverCardContent>
 *     </HoverCard>
 * ```
 */
export type HoverCardTriggerProps = React.ComponentProps<typeof HoverCardTrigger>

/**
 * Props for HoverCardContent.
 *
 * @example
 * ```tsx
 * <HoverCard>
 *       <HoverCardTrigger render={<Button variant="outline" />}>
 *         Hover me
 *       </HoverCardTrigger>
 *       <HoverCardContent className="w-64">
 *         <div className="space-y-1">
 *           <p className="text-sm font-medium">@studio</p>
 *           <p className="text-sm text-muted-foreground">
 *             We build cohesive design systems for fast-moving teams.
 *           </p>
 *         </div>
 *       </HoverCardContent>
 *     </HoverCard>
 * ```
 */
export type HoverCardContentProps = React.ComponentProps<typeof HoverCardContent>


export { HoverCard, HoverCardTrigger, HoverCardContent }