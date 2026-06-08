import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"

import { cn } from "@/lib/utils"
import { IconCircle } from "@tabler/icons-react"
import type * as React from "react"

/**
 * RadioGroup component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <RadioGroup defaultValue="option-1" className="space-y-2">
 *       <div className="flex items-center gap-2">
 *         <RadioGroupItem value="option-1" id="option-1" />
 *         <Label htmlFor="option-1">Option one</Label>
 *       </div>
 *       <div className="flex items-center gap-2">
 *         <RadioGroupItem value="option-2" id="option-2" />
 *         <Label htmlFor="option-2">Option two</Label>
 *       </div>
 *     </RadioGroup>
 * ```
 */
function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("grid gap-2 w-full", className)}
      {...props}
    />
  )
}

/**
 * RadioGroupItem component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <RadioGroup defaultValue="option-1" className="space-y-2">
 *       <div className="flex items-center gap-2">
 *         <RadioGroupItem value="option-1" id="option-1" />
 *         <Label htmlFor="option-1">Option one</Label>
 *       </div>
 *       <div className="flex items-center gap-2">
 *         <RadioGroupItem value="option-2" id="option-2" />
 *         <Label htmlFor="option-2">Option two</Label>
 *       </div>
 *     </RadioGroup>
 * ```
 */
function RadioGroupItem({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        "border-input text-primary dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 flex size-4 rounded-full focus-visible:ring-[3px] aria-invalid:ring-[3px] group/radio-group-item peer relative aspect-square shrink-0 border outline-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="group-aria-invalid/radio-group-item:text-destructive text-primary flex size-4 items-center justify-center"
      >
        <IconCircle className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 fill-current" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  )
}
/**
 * Props for RadioGroup.
 *
 * @example
 * ```tsx
 * <RadioGroup defaultValue="option-1" className="space-y-2">
 *       <div className="flex items-center gap-2">
 *         <RadioGroupItem value="option-1" id="option-1" />
 *         <Label htmlFor="option-1">Option one</Label>
 *       </div>
 *       <div className="flex items-center gap-2">
 *         <RadioGroupItem value="option-2" id="option-2" />
 *         <Label htmlFor="option-2">Option two</Label>
 *       </div>
 *     </RadioGroup>
 * ```
 */
export type RadioGroupProps = React.ComponentProps<typeof RadioGroup>

/**
 * Props for RadioGroupItem.
 *
 * @example
 * ```tsx
 * <RadioGroup defaultValue="option-1" className="space-y-2">
 *       <div className="flex items-center gap-2">
 *         <RadioGroupItem value="option-1" id="option-1" />
 *         <Label htmlFor="option-1">Option one</Label>
 *       </div>
 *       <div className="flex items-center gap-2">
 *         <RadioGroupItem value="option-2" id="option-2" />
 *         <Label htmlFor="option-2">Option two</Label>
 *       </div>
 *     </RadioGroup>
 * ```
 */
export type RadioGroupItemProps = React.ComponentProps<typeof RadioGroupItem>


export { RadioGroup, RadioGroupItem }