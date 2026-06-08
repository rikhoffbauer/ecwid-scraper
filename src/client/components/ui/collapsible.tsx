"use client"

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"
import type * as React from "react"

/**
 * Collapsible component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Collapsible className="w-80 space-y-2">
 *       <CollapsibleTrigger render={<Button variant="outline" />}>
 *         Toggle details
 *       </CollapsibleTrigger>
 *       <CollapsibleContent className="rounded-lg border p-3 text-sm text-muted-foreground">
 *         This section reveals additional details when expanded.
 *       </CollapsibleContent>
 *     </Collapsible>
 * ```
 */
function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

/**
 * CollapsibleTrigger component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Collapsible className="w-80 space-y-2">
 *       <CollapsibleTrigger render={<Button variant="outline" />}>
 *         Toggle details
 *       </CollapsibleTrigger>
 *       <CollapsibleContent className="rounded-lg border p-3 text-sm text-muted-foreground">
 *         This section reveals additional details when expanded.
 *       </CollapsibleContent>
 *     </Collapsible>
 * ```
 */
function CollapsibleTrigger({ ...props }: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />
  )
}

/**
 * CollapsibleContent component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Collapsible className="w-80 space-y-2">
 *       <CollapsibleTrigger render={<Button variant="outline" />}>
 *         Toggle details
 *       </CollapsibleTrigger>
 *       <CollapsibleContent className="rounded-lg border p-3 text-sm text-muted-foreground">
 *         This section reveals additional details when expanded.
 *       </CollapsibleContent>
 *     </Collapsible>
 * ```
 */
function CollapsibleContent({ ...props }: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />
  )
}
/**
 * Props for Collapsible.
 *
 * @example
 * ```tsx
 * <Collapsible className="w-80 space-y-2">
 *       <CollapsibleTrigger render={<Button variant="outline" />}>
 *         Toggle details
 *       </CollapsibleTrigger>
 *       <CollapsibleContent className="rounded-lg border p-3 text-sm text-muted-foreground">
 *         This section reveals additional details when expanded.
 *       </CollapsibleContent>
 *     </Collapsible>
 * ```
 */
export type CollapsibleProps = React.ComponentProps<typeof Collapsible>

/**
 * Props for CollapsibleTrigger.
 *
 * @example
 * ```tsx
 * <Collapsible className="w-80 space-y-2">
 *       <CollapsibleTrigger render={<Button variant="outline" />}>
 *         Toggle details
 *       </CollapsibleTrigger>
 *       <CollapsibleContent className="rounded-lg border p-3 text-sm text-muted-foreground">
 *         This section reveals additional details when expanded.
 *       </CollapsibleContent>
 *     </Collapsible>
 * ```
 */
export type CollapsibleTriggerProps = React.ComponentProps<typeof CollapsibleTrigger>

/**
 * Props for CollapsibleContent.
 *
 * @example
 * ```tsx
 * <Collapsible className="w-80 space-y-2">
 *       <CollapsibleTrigger render={<Button variant="outline" />}>
 *         Toggle details
 *       </CollapsibleTrigger>
 *       <CollapsibleContent className="rounded-lg border p-3 text-sm text-muted-foreground">
 *         This section reveals additional details when expanded.
 *       </CollapsibleContent>
 *     </Collapsible>
 * ```
 */
export type CollapsibleContentProps = React.ComponentProps<typeof CollapsibleContent>


export { Collapsible, CollapsibleTrigger, CollapsibleContent }