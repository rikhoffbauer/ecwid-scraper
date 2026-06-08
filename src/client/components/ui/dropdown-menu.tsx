import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"

import { cn } from "@/lib/utils"
import { IconChevronRight, IconCheck } from "@tabler/icons-react"

/**
 * DropdownMenu component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

/**
 * DropdownMenuPortal component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
function DropdownMenuPortal({ ...props }: MenuPrimitive.Portal.Props) {
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
}

/**
 * DropdownMenuTrigger component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
function DropdownMenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

/**
 * DropdownMenuContent component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<
    MenuPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn("data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground min-w-32 rounded-lg p-1 shadow-md ring-1 duration-100 z-50 max-h-(--available-height) w-(--anchor-width) origin-(--transform-origin) overflow-x-hidden overflow-y-auto outline-none data-closed:overflow-hidden", className )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

/**
 * DropdownMenuGroup component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
function DropdownMenuGroup({ ...props }: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
}

/**
 * DropdownMenuLabel component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
function DropdownMenuLabel({
  className,
  inset,
  ...props
}: MenuPrimitive.GroupLabel.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn("text-muted-foreground px-1.5 py-1 text-xs font-medium data-[inset]:pl-8", className)}
      {...props}
    />
  )
}

/**
 * DropdownMenuItem component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: MenuPrimitive.Item.Props & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:text-destructive not-data-[variant=destructive]:focus:**:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm [&_svg:not([class*='size-'])]:size-4 group/dropdown-menu-item relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * DropdownMenuSub component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
function DropdownMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />
}

/**
 * DropdownMenuSubTrigger component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm [&_svg:not([class*='size-'])]:size-4 flex cursor-default items-center outline-hidden select-none data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      {children}
      <IconChevronRight className="ml-auto" />
    </MenuPrimitive.SubmenuTrigger>
  )
}

/**
 * DropdownMenuSubContent component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
function DropdownMenuSubContent({
  align = "start",
  alignOffset = -3,
  side = "right",
  sideOffset = 0,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      data-slot="dropdown-menu-sub-content"
      className={cn("data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground min-w-[96px] rounded-md p-1 shadow-lg ring-1 duration-100 w-auto", className)}
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  )
}

/**
 * DropdownMenuCheckboxItem component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: MenuPrimitive.CheckboxItem.Props) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      checked={checked}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center pointer-events-none"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        <MenuPrimitive.CheckboxItemIndicator>
          <IconCheck
          />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  )
}

/**
 * DropdownMenuRadioGroup component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
function DropdownMenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props) {
  return (
    <MenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

/**
 * DropdownMenuRadioItem component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: MenuPrimitive.RadioItem.Props) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center pointer-events-none"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        <MenuPrimitive.RadioItemIndicator>
          <IconCheck
          />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  )
}

/**
 * DropdownMenuSeparator component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
function DropdownMenuSeparator({
  className,
  ...props
}: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  )
}

/**
 * DropdownMenuShortcut component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn("text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground ml-auto text-xs tracking-widest", className)}
      {...props}
    />
  )
}
/**
 * Props for DropdownMenu.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
export type DropdownMenuProps = React.ComponentProps<typeof DropdownMenu>

/**
 * Props for DropdownMenuPortal.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
export type DropdownMenuPortalProps = React.ComponentProps<typeof DropdownMenuPortal>

/**
 * Props for DropdownMenuTrigger.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
export type DropdownMenuTriggerProps = React.ComponentProps<typeof DropdownMenuTrigger>

/**
 * Props for DropdownMenuContent.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
export type DropdownMenuContentProps = React.ComponentProps<typeof DropdownMenuContent>

/**
 * Props for DropdownMenuGroup.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
export type DropdownMenuGroupProps = React.ComponentProps<typeof DropdownMenuGroup>

/**
 * Props for DropdownMenuLabel.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
export type DropdownMenuLabelProps = React.ComponentProps<typeof DropdownMenuLabel>

/**
 * Props for DropdownMenuItem.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
export type DropdownMenuItemProps = React.ComponentProps<typeof DropdownMenuItem>

/**
 * Props for DropdownMenuSub.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
export type DropdownMenuSubProps = React.ComponentProps<typeof DropdownMenuSub>

/**
 * Props for DropdownMenuSubTrigger.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
export type DropdownMenuSubTriggerProps = React.ComponentProps<typeof DropdownMenuSubTrigger>

/**
 * Props for DropdownMenuSubContent.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
export type DropdownMenuSubContentProps = React.ComponentProps<typeof DropdownMenuSubContent>

/**
 * Props for DropdownMenuCheckboxItem.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
export type DropdownMenuCheckboxItemProps = React.ComponentProps<typeof DropdownMenuCheckboxItem>

/**
 * Props for DropdownMenuRadioGroup.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
export type DropdownMenuRadioGroupProps = React.ComponentProps<typeof DropdownMenuRadioGroup>

/**
 * Props for DropdownMenuRadioItem.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
export type DropdownMenuRadioItemProps = React.ComponentProps<typeof DropdownMenuRadioItem>

/**
 * Props for DropdownMenuSeparator.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
export type DropdownMenuSeparatorProps = React.ComponentProps<typeof DropdownMenuSeparator>

/**
 * Props for DropdownMenuShortcut.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *       <DropdownMenuTrigger render={<Button />}>Open menu</DropdownMenuTrigger>
 *       <DropdownMenuContent>
 *         <DropdownMenuItem>Profile</DropdownMenuItem>
 *         <DropdownMenuItem>Billing</DropdownMenuItem>
 *         <DropdownMenuSeparator />
 *         <DropdownMenuItem>Sign out</DropdownMenuItem>
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 * ```
 */
export type DropdownMenuShortcutProps = React.ComponentProps<typeof DropdownMenuShortcut>


export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
