import * as React from "react"
import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu"

import { cn } from "@/lib/utils"
import { IconChevronRight, IconCheck } from "@tabler/icons-react"

/**
 * ContextMenu component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
function ContextMenu({ ...props }: ContextMenuPrimitive.Root.Props) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />
}

/**
 * ContextMenuPortal component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
function ContextMenuPortal({ ...props }: ContextMenuPrimitive.Portal.Props) {
  return (
    <ContextMenuPrimitive.Portal data-slot="context-menu-portal" {...props} />
  )
}

/**
 * ContextMenuTrigger component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
function ContextMenuTrigger({
  className,
  ...props
}: ContextMenuPrimitive.Trigger.Props) {
  return (
    <ContextMenuPrimitive.Trigger
      data-slot="context-menu-trigger"
      className={cn("select-none", className)}
      {...props}
    />
  )
}

/**
 * ContextMenuContent component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
function ContextMenuContent({
  className,
  align = "start",
  alignOffset = 4,
  side = "right",
  sideOffset = 0,
  ...props
}: ContextMenuPrimitive.Popup.Props &
  Pick<
    ContextMenuPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <ContextMenuPrimitive.Popup
          data-slot="context-menu-content"
          className={cn("data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground min-w-36 rounded-lg p-1 shadow-md ring-1 duration-100 z-50 max-h-(--available-height) origin-(--transform-origin) overflow-x-hidden overflow-y-auto outline-none", className )}
          {...props}
        />
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPrimitive.Portal>
  )
}

/**
 * ContextMenuGroup component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
function ContextMenuGroup({ ...props }: ContextMenuPrimitive.Group.Props) {
  return (
    <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />
  )
}

/**
 * ContextMenuLabel component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
function ContextMenuLabel({
  className,
  inset,
  ...props
}: ContextMenuPrimitive.GroupLabel.Props & {
  inset?: boolean
}) {
  return (
    <ContextMenuPrimitive.GroupLabel
      data-slot="context-menu-label"
      data-inset={inset}
      className={cn("text-muted-foreground px-1.5 py-1 text-xs font-medium data-[inset]:pl-8", className)}
      {...props}
    />
  )
}

/**
 * ContextMenuItem component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
function ContextMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: ContextMenuPrimitive.Item.Props & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:text-destructive focus:*:[svg]:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm [&_svg:not([class*='size-'])]:size-4 group/context-menu-item relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * ContextMenuSub component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
function ContextMenuSub({ ...props }: ContextMenuPrimitive.SubmenuRoot.Props) {
  return (
    <ContextMenuPrimitive.SubmenuRoot data-slot="context-menu-sub" {...props} />
  )
}

/**
 * ContextMenuSubTrigger component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
function ContextMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: ContextMenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean
}) {
  return (
    <ContextMenuPrimitive.SubmenuTrigger
      data-slot="context-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm [&_svg:not([class*='size-'])]:size-4 flex cursor-default items-center outline-hidden select-none data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      {children}
      <IconChevronRight className="ml-auto" />
    </ContextMenuPrimitive.SubmenuTrigger>
  )
}

/**
 * ContextMenuSubContent component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
function ContextMenuSubContent({
  ...props
}: React.ComponentProps<typeof ContextMenuContent>) {
  return (
    <ContextMenuContent
      data-slot="context-menu-sub-content"
      className="shadow-lg"
      side="right"
      {...props}
    />
  )
}

/**
 * ContextMenuCheckboxItem component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
function ContextMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: ContextMenuPrimitive.CheckboxItem.Props) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      data-slot="context-menu-checkbox-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="absolute right-2 pointer-events-none">
        <ContextMenuPrimitive.CheckboxItemIndicator>
          <IconCheck
          />
        </ContextMenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  )
}

/**
 * ContextMenuRadioGroup component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
function ContextMenuRadioGroup({
  ...props
}: ContextMenuPrimitive.RadioGroup.Props) {
  return (
    <ContextMenuPrimitive.RadioGroup
      data-slot="context-menu-radio-group"
      {...props}
    />
  )
}

/**
 * ContextMenuRadioItem component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
function ContextMenuRadioItem({
  className,
  children,
  ...props
}: ContextMenuPrimitive.RadioItem.Props) {
  return (
    <ContextMenuPrimitive.RadioItem
      data-slot="context-menu-radio-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      <span className="absolute right-2 pointer-events-none">
        <ContextMenuPrimitive.RadioItemIndicator>
          <IconCheck
          />
        </ContextMenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  )
}

/**
 * ContextMenuSeparator component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
function ContextMenuSeparator({
  className,
  ...props
}: ContextMenuPrimitive.Separator.Props) {
  return (
    <ContextMenuPrimitive.Separator
      data-slot="context-menu-separator"
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  )
}

/**
 * ContextMenuShortcut component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
function ContextMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="context-menu-shortcut"
      className={cn("text-muted-foreground group-focus/context-menu-item:text-accent-foreground ml-auto text-xs tracking-widest", className)}
      {...props}
    />
  )
}
/**
 * Props for ContextMenu.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
export type ContextMenuProps = React.ComponentProps<typeof ContextMenu>

/**
 * Props for ContextMenuPortal.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
export type ContextMenuPortalProps = React.ComponentProps<typeof ContextMenuPortal>

/**
 * Props for ContextMenuTrigger.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
export type ContextMenuTriggerProps = React.ComponentProps<typeof ContextMenuTrigger>

/**
 * Props for ContextMenuContent.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
export type ContextMenuContentProps = React.ComponentProps<typeof ContextMenuContent>

/**
 * Props for ContextMenuGroup.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
export type ContextMenuGroupProps = React.ComponentProps<typeof ContextMenuGroup>

/**
 * Props for ContextMenuLabel.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
export type ContextMenuLabelProps = React.ComponentProps<typeof ContextMenuLabel>

/**
 * Props for ContextMenuItem.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
export type ContextMenuItemProps = React.ComponentProps<typeof ContextMenuItem>

/**
 * Props for ContextMenuSub.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
export type ContextMenuSubProps = React.ComponentProps<typeof ContextMenuSub>

/**
 * Props for ContextMenuSubTrigger.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
export type ContextMenuSubTriggerProps = React.ComponentProps<typeof ContextMenuSubTrigger>

/**
 * Props for ContextMenuSubContent.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
export type ContextMenuSubContentProps = React.ComponentProps<typeof ContextMenuSubContent>

/**
 * Props for ContextMenuCheckboxItem.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
export type ContextMenuCheckboxItemProps = React.ComponentProps<typeof ContextMenuCheckboxItem>

/**
 * Props for ContextMenuRadioGroup.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
export type ContextMenuRadioGroupProps = React.ComponentProps<typeof ContextMenuRadioGroup>

/**
 * Props for ContextMenuRadioItem.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
export type ContextMenuRadioItemProps = React.ComponentProps<typeof ContextMenuRadioItem>

/**
 * Props for ContextMenuSeparator.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
export type ContextMenuSeparatorProps = React.ComponentProps<typeof ContextMenuSeparator>

/**
 * Props for ContextMenuShortcut.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *       <ContextMenuTrigger className="bg-muted flex h-24 w-64 items-center justify-center rounded-lg text-sm">
 *         Right click here
 *       </ContextMenuTrigger>
 *       <ContextMenuContent>
 *         <ContextMenuItem>Rename</ContextMenuItem>
 *         <ContextMenuItem>Duplicate</ContextMenuItem>
 *         <ContextMenuSeparator />
 *         <ContextMenuItem>Archive</ContextMenuItem>
 *       </ContextMenuContent>
 *     </ContextMenu>
 * ```
 */
export type ContextMenuShortcutProps = React.ComponentProps<typeof ContextMenuShortcut>


export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
}
