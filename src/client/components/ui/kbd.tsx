import { cn } from "@/lib/utils"
import type * as React from "react"

/**
 * Kbd component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <KbdGroup>
 *       <Kbd>Ctrl</Kbd>
 *       <span>+</span>
 *       <Kbd>K</Kbd>
 *     </KbdGroup>
 * ```
 */
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "bg-muted text-muted-foreground [[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10 h-5 w-fit min-w-5 gap-1 rounded-sm px-1 font-sans text-xs font-medium [&_svg:not([class*='size-'])]:size-3 pointer-events-none inline-flex items-center justify-center select-none",
        className
      )}
      {...props}
    />
  )
}

/**
 * KbdGroup component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <KbdGroup>
 *       <Kbd>Ctrl</Kbd>
 *       <span>+</span>
 *       <Kbd>K</Kbd>
 *     </KbdGroup>
 * ```
 */
function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("gap-1 inline-flex items-center", className)}
      {...props}
    />
  )
}
/**
 * Props for Kbd.
 *
 * @example
 * ```tsx
 * <KbdGroup>
 *       <Kbd>Ctrl</Kbd>
 *       <span>+</span>
 *       <Kbd>K</Kbd>
 *     </KbdGroup>
 * ```
 */
export type KbdProps = React.ComponentProps<typeof Kbd>

/**
 * Props for KbdGroup.
 *
 * @example
 * ```tsx
 * <KbdGroup>
 *       <Kbd>Ctrl</Kbd>
 *       <span>+</span>
 *       <Kbd>K</Kbd>
 *     </KbdGroup>
 * ```
 */
export type KbdGroupProps = React.ComponentProps<typeof KbdGroup>


export { Kbd, KbdGroup }