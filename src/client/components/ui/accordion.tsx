import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion"

import { cn } from "@/lib/utils"
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react"
import type * as React from "react"

/**
 * Accordion component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Accordion type="single" collapsible className="w-80">
 *       <AccordionItem value="item-1">
 *         <AccordionTrigger>First section</AccordionTrigger>
 *         <AccordionContent>
 *           This is a short accordion panel with a description.
 *         </AccordionContent>
 *       </AccordionItem>
 *       <AccordionItem value="item-2">
 *         <AccordionTrigger>Second section</AccordionTrigger>
 *         <AccordionContent>
 *           Add more content to demonstrate multiple panels.
 *         </AccordionContent>
 *       </AccordionItem>
 *     </Accordion>
 * ```
 */
function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("flex w-full flex-col", className)}
      {...props}
    />
  )
}

/**
 * AccordionItem component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Accordion type="single" collapsible className="w-80">
 *       <AccordionItem value="item-1">
 *         <AccordionTrigger>First section</AccordionTrigger>
 *         <AccordionContent>
 *           This is a short accordion panel with a description.
 *         </AccordionContent>
 *       </AccordionItem>
 *       <AccordionItem value="item-2">
 *         <AccordionTrigger>Second section</AccordionTrigger>
 *         <AccordionContent>
 *           Add more content to demonstrate multiple panels.
 *         </AccordionContent>
 *       </AccordionItem>
 *     </Accordion>
 * ```
 */
function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("not-last:border-b", className)}
      {...props}
    />
  )
}

/**
 * AccordionTrigger component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Accordion type="single" collapsible className="w-80">
 *       <AccordionItem value="item-1">
 *         <AccordionTrigger>First section</AccordionTrigger>
 *         <AccordionContent>
 *           This is a short accordion panel with a description.
 *         </AccordionContent>
 *       </AccordionItem>
 *       <AccordionItem value="item-2">
 *         <AccordionTrigger>Second section</AccordionTrigger>
 *         <AccordionContent>
 *           Add more content to demonstrate multiple panels.
 *         </AccordionContent>
 *       </AccordionItem>
 *     </Accordion>
 * ```
 */
function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "focus-visible:ring-ring/50 focus-visible:border-ring focus-visible:after:border-ring **:data-[slot=accordion-trigger-icon]:text-muted-foreground rounded-lg py-2.5 text-left text-sm font-medium hover:underline focus-visible:ring-[3px] **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4 group/accordion-trigger relative flex flex-1 items-start justify-between border border-transparent transition-all outline-none disabled:pointer-events-none disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
        <IconChevronDown data-slot="accordion-trigger-icon" className="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden" />
        <IconChevronUp data-slot="accordion-trigger-icon" className="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

/**
 * AccordionContent component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Accordion type="single" collapsible className="w-80">
 *       <AccordionItem value="item-1">
 *         <AccordionTrigger>First section</AccordionTrigger>
 *         <AccordionContent>
 *           This is a short accordion panel with a description.
 *         </AccordionContent>
 *       </AccordionItem>
 *       <AccordionItem value="item-2">
 *         <AccordionTrigger>Second section</AccordionTrigger>
 *         <AccordionContent>
 *           Add more content to demonstrate multiple panels.
 *         </AccordionContent>
 *       </AccordionItem>
 *     </Accordion>
 * ```
 */
function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="data-open:animate-accordion-down data-closed:animate-accordion-up text-sm overflow-hidden"
      {...props}
    >
      <div
        className={cn(
          "pt-0 pb-2.5 [&_a]:hover:text-foreground h-(--accordion-panel-height) data-ending-style:h-0 data-starting-style:h-0 [&_a]:underline [&_a]:underline-offset-3 [&_p:not(:last-child)]:mb-4",
          className
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Panel>
  )
}
/**
 * Props for Accordion.
 *
 * @example
 * ```tsx
 * <Accordion type="single" collapsible className="w-80">
 *       <AccordionItem value="item-1">
 *         <AccordionTrigger>First section</AccordionTrigger>
 *         <AccordionContent>
 *           This is a short accordion panel with a description.
 *         </AccordionContent>
 *       </AccordionItem>
 *       <AccordionItem value="item-2">
 *         <AccordionTrigger>Second section</AccordionTrigger>
 *         <AccordionContent>
 *           Add more content to demonstrate multiple panels.
 *         </AccordionContent>
 *       </AccordionItem>
 *     </Accordion>
 * ```
 */
export type AccordionProps = React.ComponentProps<typeof Accordion>

/**
 * Props for AccordionItem.
 *
 * @example
 * ```tsx
 * <Accordion type="single" collapsible className="w-80">
 *       <AccordionItem value="item-1">
 *         <AccordionTrigger>First section</AccordionTrigger>
 *         <AccordionContent>
 *           This is a short accordion panel with a description.
 *         </AccordionContent>
 *       </AccordionItem>
 *       <AccordionItem value="item-2">
 *         <AccordionTrigger>Second section</AccordionTrigger>
 *         <AccordionContent>
 *           Add more content to demonstrate multiple panels.
 *         </AccordionContent>
 *       </AccordionItem>
 *     </Accordion>
 * ```
 */
export type AccordionItemProps = React.ComponentProps<typeof AccordionItem>

/**
 * Props for AccordionTrigger.
 *
 * @example
 * ```tsx
 * <Accordion type="single" collapsible className="w-80">
 *       <AccordionItem value="item-1">
 *         <AccordionTrigger>First section</AccordionTrigger>
 *         <AccordionContent>
 *           This is a short accordion panel with a description.
 *         </AccordionContent>
 *       </AccordionItem>
 *       <AccordionItem value="item-2">
 *         <AccordionTrigger>Second section</AccordionTrigger>
 *         <AccordionContent>
 *           Add more content to demonstrate multiple panels.
 *         </AccordionContent>
 *       </AccordionItem>
 *     </Accordion>
 * ```
 */
export type AccordionTriggerProps = React.ComponentProps<typeof AccordionTrigger>

/**
 * Props for AccordionContent.
 *
 * @example
 * ```tsx
 * <Accordion type="single" collapsible className="w-80">
 *       <AccordionItem value="item-1">
 *         <AccordionTrigger>First section</AccordionTrigger>
 *         <AccordionContent>
 *           This is a short accordion panel with a description.
 *         </AccordionContent>
 *       </AccordionItem>
 *       <AccordionItem value="item-2">
 *         <AccordionTrigger>Second section</AccordionTrigger>
 *         <AccordionContent>
 *           Add more content to demonstrate multiple panels.
 *         </AccordionContent>
 *       </AccordionItem>
 *     </Accordion>
 * ```
 */
export type AccordionContentProps = React.ComponentProps<typeof AccordionContent>


export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }