"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"

import { cn } from "@/lib/utils"
import { IconSelector, IconCheck, IconChevronUp, IconChevronDown } from "@tabler/icons-react"

/**
 * Select component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Select>
 *       <SelectTrigger className="w-48">
 *         <SelectValue placeholder="Select a plan" />
 *       </SelectTrigger>
 *       <SelectContent>
 *         <SelectItem value="starter">Starter</SelectItem>
 *         <SelectItem value="team">Team</SelectItem>
 *         <SelectItem value="enterprise">Enterprise</SelectItem>
 *       </SelectContent>
 *     </Select>
 * ```
 */
const Select = SelectPrimitive.Root

/**
 * SelectGroup component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Select>
 *       <SelectTrigger className="w-48">
 *         <SelectValue placeholder="Select a plan" />
 *       </SelectTrigger>
 *       <SelectContent>
 *         <SelectItem value="starter">Starter</SelectItem>
 *         <SelectItem value="team">Team</SelectItem>
 *         <SelectItem value="enterprise">Enterprise</SelectItem>
 *       </SelectContent>
 *     </Select>
 * ```
 */
function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  )
}

/**
 * SelectValue component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Select>
 *       <SelectTrigger className="w-48">
 *         <SelectValue placeholder="Select a plan" />
 *       </SelectTrigger>
 *       <SelectContent>
 *         <SelectItem value="starter">Starter</SelectItem>
 *         <SelectItem value="team">Team</SelectItem>
 *         <SelectItem value="enterprise">Enterprise</SelectItem>
 *       </SelectContent>
 *     </Select>
 * ```
 */
function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("flex flex-1 text-left", className)}
      {...props}
    />
  )
}

/**
 * SelectTrigger component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Select>
 *       <SelectTrigger className="w-48">
 *         <SelectValue placeholder="Select a plan" />
 *       </SelectTrigger>
 *       <SelectContent>
 *         <SelectItem value="starter">Starter</SelectItem>
 *         <SelectItem value="team">Team</SelectItem>
 *         <SelectItem value="enterprise">Enterprise</SelectItem>
 *       </SelectContent>
 *     </Select>
 * ```
 */
function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "border-input data-[placeholder]:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 gap-1.5 rounded-lg border bg-transparent py-2 pr-2 pl-2.5 text-sm transition-colors select-none focus-visible:ring-[3px] aria-invalid:ring-[3px] data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] *:data-[slot=select-value]:flex *:data-[slot=select-value]:gap-1.5 [&_svg:not([class*='size-'])]:size-4 flex w-fit items-center justify-between whitespace-nowrap outline-none disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <IconSelector className="text-muted-foreground size-4 pointer-events-none" />
        }
      />
    </SelectPrimitive.Trigger>
  )
}

/**
 * SelectContent component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Select>
 *       <SelectTrigger className="w-48">
 *         <SelectValue placeholder="Select a plan" />
 *       </SelectTrigger>
 *       <SelectContent>
 *         <SelectItem value="starter">Starter</SelectItem>
 *         <SelectItem value="team">Team</SelectItem>
 *         <SelectItem value="enterprise">Enterprise</SelectItem>
 *       </SelectContent>
 *     </Select>
 * ```
 */
function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = true,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn("bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 min-w-36 rounded-lg shadow-md ring-1 duration-100 relative isolate z-50 max-h-(--available-height) w-(--anchor-width) origin-(--transform-origin) overflow-x-hidden overflow-y-auto", className )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

/**
 * SelectLabel component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Select>
 *       <SelectTrigger className="w-48">
 *         <SelectValue placeholder="Select a plan" />
 *       </SelectTrigger>
 *       <SelectContent>
 *         <SelectItem value="starter">Starter</SelectItem>
 *         <SelectItem value="team">Team</SelectItem>
 *         <SelectItem value="enterprise">Enterprise</SelectItem>
 *       </SelectContent>
 *     </Select>
 * ```
 */
function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("text-muted-foreground px-1.5 py-1 text-xs", className)}
      {...props}
    />
  )
}

/**
 * SelectItem component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Select>
 *       <SelectTrigger className="w-48">
 *         <SelectValue placeholder="Select a plan" />
 *       </SelectTrigger>
 *       <SelectContent>
 *         <SelectItem value="starter">Starter</SelectItem>
 *         <SelectItem value="team">Team</SelectItem>
 *         <SelectItem value="enterprise">Enterprise</SelectItem>
 *       </SelectContent>
 *     </Select>
 * ```
 */
function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2 relative flex w-full cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex flex-1 gap-2 shrink-0 whitespace-nowrap">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={<span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />}
      >
        <IconCheck className="pointer-events-none" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

/**
 * SelectSeparator component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Select>
 *       <SelectTrigger className="w-48">
 *         <SelectValue placeholder="Select a plan" />
 *       </SelectTrigger>
 *       <SelectContent>
 *         <SelectItem value="starter">Starter</SelectItem>
 *         <SelectItem value="team">Team</SelectItem>
 *         <SelectItem value="enterprise">Enterprise</SelectItem>
 *       </SelectContent>
 *     </Select>
 * ```
 */
function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("bg-border -mx-1 my-1 h-px pointer-events-none", className)}
      {...props}
    />
  )
}

/**
 * SelectScrollUpButton component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Select>
 *       <SelectTrigger className="w-48">
 *         <SelectValue placeholder="Select a plan" />
 *       </SelectTrigger>
 *       <SelectContent>
 *         <SelectItem value="starter">Starter</SelectItem>
 *         <SelectItem value="team">Team</SelectItem>
 *         <SelectItem value="enterprise">Enterprise</SelectItem>
 *       </SelectContent>
 *     </Select>
 * ```
 */
function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn("bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4 top-0 w-full", className)}
      {...props}
    >
      <IconChevronUp
      />
    </SelectPrimitive.ScrollUpArrow>
  )
}

/**
 * SelectScrollDownButton component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Select>
 *       <SelectTrigger className="w-48">
 *         <SelectValue placeholder="Select a plan" />
 *       </SelectTrigger>
 *       <SelectContent>
 *         <SelectItem value="starter">Starter</SelectItem>
 *         <SelectItem value="team">Team</SelectItem>
 *         <SelectItem value="enterprise">Enterprise</SelectItem>
 *       </SelectContent>
 *     </Select>
 * ```
 */
function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn("bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4 bottom-0 w-full", className)}
      {...props}
    >
      <IconChevronDown
      />
    </SelectPrimitive.ScrollDownArrow>
  )
}
/**
 * Props for Select.
 *
 * @example
 * ```tsx
 * <Select>
 *       <SelectTrigger className="w-48">
 *         <SelectValue placeholder="Select a plan" />
 *       </SelectTrigger>
 *       <SelectContent>
 *         <SelectItem value="starter">Starter</SelectItem>
 *         <SelectItem value="team">Team</SelectItem>
 *         <SelectItem value="enterprise">Enterprise</SelectItem>
 *       </SelectContent>
 *     </Select>
 * ```
 */
export type SelectProps = React.ComponentProps<typeof Select>

/**
 * Props for SelectGroup.
 *
 * @example
 * ```tsx
 * <Select>
 *       <SelectTrigger className="w-48">
 *         <SelectValue placeholder="Select a plan" />
 *       </SelectTrigger>
 *       <SelectContent>
 *         <SelectItem value="starter">Starter</SelectItem>
 *         <SelectItem value="team">Team</SelectItem>
 *         <SelectItem value="enterprise">Enterprise</SelectItem>
 *       </SelectContent>
 *     </Select>
 * ```
 */
export type SelectGroupProps = React.ComponentProps<typeof SelectGroup>

/**
 * Props for SelectValue.
 *
 * @example
 * ```tsx
 * <Select>
 *       <SelectTrigger className="w-48">
 *         <SelectValue placeholder="Select a plan" />
 *       </SelectTrigger>
 *       <SelectContent>
 *         <SelectItem value="starter">Starter</SelectItem>
 *         <SelectItem value="team">Team</SelectItem>
 *         <SelectItem value="enterprise">Enterprise</SelectItem>
 *       </SelectContent>
 *     </Select>
 * ```
 */
export type SelectValueProps = React.ComponentProps<typeof SelectValue>

/**
 * Props for SelectTrigger.
 *
 * @example
 * ```tsx
 * <Select>
 *       <SelectTrigger className="w-48">
 *         <SelectValue placeholder="Select a plan" />
 *       </SelectTrigger>
 *       <SelectContent>
 *         <SelectItem value="starter">Starter</SelectItem>
 *         <SelectItem value="team">Team</SelectItem>
 *         <SelectItem value="enterprise">Enterprise</SelectItem>
 *       </SelectContent>
 *     </Select>
 * ```
 */
export type SelectTriggerProps = React.ComponentProps<typeof SelectTrigger>

/**
 * Props for SelectContent.
 *
 * @example
 * ```tsx
 * <Select>
 *       <SelectTrigger className="w-48">
 *         <SelectValue placeholder="Select a plan" />
 *       </SelectTrigger>
 *       <SelectContent>
 *         <SelectItem value="starter">Starter</SelectItem>
 *         <SelectItem value="team">Team</SelectItem>
 *         <SelectItem value="enterprise">Enterprise</SelectItem>
 *       </SelectContent>
 *     </Select>
 * ```
 */
export type SelectContentProps = React.ComponentProps<typeof SelectContent>

/**
 * Props for SelectLabel.
 *
 * @example
 * ```tsx
 * <Select>
 *       <SelectTrigger className="w-48">
 *         <SelectValue placeholder="Select a plan" />
 *       </SelectTrigger>
 *       <SelectContent>
 *         <SelectItem value="starter">Starter</SelectItem>
 *         <SelectItem value="team">Team</SelectItem>
 *         <SelectItem value="enterprise">Enterprise</SelectItem>
 *       </SelectContent>
 *     </Select>
 * ```
 */
export type SelectLabelProps = React.ComponentProps<typeof SelectLabel>

/**
 * Props for SelectItem.
 *
 * @example
 * ```tsx
 * <Select>
 *       <SelectTrigger className="w-48">
 *         <SelectValue placeholder="Select a plan" />
 *       </SelectTrigger>
 *       <SelectContent>
 *         <SelectItem value="starter">Starter</SelectItem>
 *         <SelectItem value="team">Team</SelectItem>
 *         <SelectItem value="enterprise">Enterprise</SelectItem>
 *       </SelectContent>
 *     </Select>
 * ```
 */
export type SelectItemProps = React.ComponentProps<typeof SelectItem>

/**
 * Props for SelectSeparator.
 *
 * @example
 * ```tsx
 * <Select>
 *       <SelectTrigger className="w-48">
 *         <SelectValue placeholder="Select a plan" />
 *       </SelectTrigger>
 *       <SelectContent>
 *         <SelectItem value="starter">Starter</SelectItem>
 *         <SelectItem value="team">Team</SelectItem>
 *         <SelectItem value="enterprise">Enterprise</SelectItem>
 *       </SelectContent>
 *     </Select>
 * ```
 */
export type SelectSeparatorProps = React.ComponentProps<typeof SelectSeparator>

/**
 * Props for SelectScrollUpButton.
 *
 * @example
 * ```tsx
 * <Select>
 *       <SelectTrigger className="w-48">
 *         <SelectValue placeholder="Select a plan" />
 *       </SelectTrigger>
 *       <SelectContent>
 *         <SelectItem value="starter">Starter</SelectItem>
 *         <SelectItem value="team">Team</SelectItem>
 *         <SelectItem value="enterprise">Enterprise</SelectItem>
 *       </SelectContent>
 *     </Select>
 * ```
 */
export type SelectScrollUpButtonProps = React.ComponentProps<typeof SelectScrollUpButton>

/**
 * Props for SelectScrollDownButton.
 *
 * @example
 * ```tsx
 * <Select>
 *       <SelectTrigger className="w-48">
 *         <SelectValue placeholder="Select a plan" />
 *       </SelectTrigger>
 *       <SelectContent>
 *         <SelectItem value="starter">Starter</SelectItem>
 *         <SelectItem value="team">Team</SelectItem>
 *         <SelectItem value="enterprise">Enterprise</SelectItem>
 *       </SelectContent>
 *     </Select>
 * ```
 */
export type SelectScrollDownButtonProps = React.ComponentProps<typeof SelectScrollDownButton>


export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
