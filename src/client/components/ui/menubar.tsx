import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { Menubar as MenubarPrimitive } from "@base-ui/react/menubar"

import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { IconCheck } from "@tabler/icons-react"

/**
 * Menubar component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
function Menubar({ className, ...props }: MenubarPrimitive.Props) {
  return (
    <MenubarPrimitive
      data-slot="menubar"
      className={cn("bg-background h-8 gap-0.5 rounded-lg border p-1 flex items-center", className)}
      {...props}
    />
  )
}

/**
 * MenubarMenu component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
function MenubarMenu({ ...props }: React.ComponentProps<typeof DropdownMenu>) {
  return <DropdownMenu data-slot="menubar-menu" {...props} />
}

/**
 * MenubarGroup component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
function MenubarGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuGroup>) {
  return <DropdownMenuGroup data-slot="menubar-group" {...props} />
}

/**
 * MenubarPortal component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
function MenubarPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPortal>) {
  return <DropdownMenuPortal data-slot="menubar-portal" {...props} />
}

/**
 * MenubarTrigger component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
function MenubarTrigger({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuTrigger>) {
  return (
    <DropdownMenuTrigger
      data-slot="menubar-trigger"
      className={cn(
        "hover:bg-muted aria-expanded:bg-muted rounded-sm px-1.5 py-px text-sm font-medium flex items-center outline-hidden select-none",
        className
      )}
      {...props}
    />
  )
}

/**
 * MenubarContent component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
function MenubarContent({
  className,
  align = "start",
  alignOffset = -4,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      data-slot="menubar-content"
      align={align}
      alignOffset={alignOffset}
      sideOffset={sideOffset}
      className={cn("bg-popover text-popover-foreground data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 min-w-36 rounded-lg p-1 shadow-md ring-1 duration-100", className)}
      {...props}
    />
  )
}

/**
 * MenubarItem component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
function MenubarItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuItem>) {
  return (
    <DropdownMenuItem
      data-slot="menubar-item"
      data-inset={inset}
      data-variant={variant}
      className={cn("focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive not-data-[variant=destructive]:focus:**:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg:not([class*='size-'])]:size-4 group/menubar-item", className)}
      {...props}
    />
  )
}

/**
 * MenubarCheckboxItem component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
function MenubarCheckboxItem({
  className,
  children,
  checked,
  ...props
}: MenuPrimitive.CheckboxItem.Props) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="menubar-checkbox-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground gap-1.5 rounded-md py-1 pr-1.5 pl-7 text-sm data-disabled:opacity-50 relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="left-1.5 size-4 [&_svg:not([class*='size-'])]:size-4 pointer-events-none absolute flex items-center justify-center">
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
 * MenubarRadioGroup component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
function MenubarRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuRadioGroup>) {
  return <DropdownMenuRadioGroup data-slot="menubar-radio-group" {...props} />
}

/**
 * MenubarRadioItem component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
function MenubarRadioItem({
  className,
  children,
  ...props
}: MenuPrimitive.RadioItem.Props) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="menubar-radio-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground gap-1.5 rounded-md py-1 pr-1.5 pl-7 text-sm data-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      <span className="left-1.5 size-4 [&_svg:not([class*='size-'])]:size-4 pointer-events-none absolute flex items-center justify-center">
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
 * MenubarLabel component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
function MenubarLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuLabel>) {
  return (
    <DropdownMenuLabel
      data-slot="menubar-label"
      data-inset={inset}
      className={cn("px-1.5 py-1 text-sm font-medium data-[inset]:pl-8", className)}
      {...props}
    />
  )
}

/**
 * MenubarSeparator component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
function MenubarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuSeparator>) {
  return (
    <DropdownMenuSeparator
      data-slot="menubar-separator"
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  )
}

/**
 * MenubarShortcut component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
function MenubarShortcut({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuShortcut>) {
  return (
    <DropdownMenuShortcut
      data-slot="menubar-shortcut"
      className={cn("text-muted-foreground group-focus/menubar-item:text-accent-foreground text-xs tracking-widest ml-auto", className)}
      {...props}
    />
  )
}

/**
 * MenubarSub component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
function MenubarSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuSub>) {
  return <DropdownMenuSub data-slot="menubar-sub" {...props} />
}

/**
 * MenubarSubTrigger component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
function MenubarSubTrigger({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuSubTrigger> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuSubTrigger
      data-slot="menubar-sub-trigger"
      data-inset={inset}
      className={cn("focus:bg-accent focus:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm data-[inset]:pl-8 [&_svg:not([class*='size-'])]:size-4", className)}
      {...props}
    />
  )
}

/**
 * MenubarSubContent component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
function MenubarSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuSubContent>) {
  return (
    <DropdownMenuSubContent
      data-slot="menubar-sub-content"
      className={cn("bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 min-w-32 rounded-lg p-1 shadow-lg ring-1 duration-100", className)}
      {...props}
    />
  )
}
/**
 * Props for Menubar.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
export type MenubarProps = React.ComponentProps<typeof Menubar>

/**
 * Props for MenubarMenu.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
export type MenubarMenuProps = React.ComponentProps<typeof MenubarMenu>

/**
 * Props for MenubarGroup.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
export type MenubarGroupProps = React.ComponentProps<typeof MenubarGroup>

/**
 * Props for MenubarPortal.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
export type MenubarPortalProps = React.ComponentProps<typeof MenubarPortal>

/**
 * Props for MenubarTrigger.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
export type MenubarTriggerProps = React.ComponentProps<typeof MenubarTrigger>

/**
 * Props for MenubarContent.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
export type MenubarContentProps = React.ComponentProps<typeof MenubarContent>

/**
 * Props for MenubarItem.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
export type MenubarItemProps = React.ComponentProps<typeof MenubarItem>

/**
 * Props for MenubarCheckboxItem.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
export type MenubarCheckboxItemProps = React.ComponentProps<typeof MenubarCheckboxItem>

/**
 * Props for MenubarRadioGroup.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
export type MenubarRadioGroupProps = React.ComponentProps<typeof MenubarRadioGroup>

/**
 * Props for MenubarRadioItem.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
export type MenubarRadioItemProps = React.ComponentProps<typeof MenubarRadioItem>

/**
 * Props for MenubarLabel.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
export type MenubarLabelProps = React.ComponentProps<typeof MenubarLabel>

/**
 * Props for MenubarSeparator.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
export type MenubarSeparatorProps = React.ComponentProps<typeof MenubarSeparator>

/**
 * Props for MenubarShortcut.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
export type MenubarShortcutProps = React.ComponentProps<typeof MenubarShortcut>

/**
 * Props for MenubarSub.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
export type MenubarSubProps = React.ComponentProps<typeof MenubarSub>

/**
 * Props for MenubarSubTrigger.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
export type MenubarSubTriggerProps = React.ComponentProps<typeof MenubarSubTrigger>

/**
 * Props for MenubarSubContent.
 *
 * @example
 * ```tsx
 * <Menubar>
 *       <MenubarMenu>
 *         <MenubarTrigger>File</MenubarTrigger>
 *         <MenubarContent>
 *           <MenubarItem>New file</MenubarItem>
 *           <MenubarItem>Open</MenubarItem>
 *           <MenubarSeparator />
 *           <MenubarItem>Save</MenubarItem>
 *         </MenubarContent>
 *       </MenubarMenu>
 *     </Menubar>
 * ```
 */
export type MenubarSubContentProps = React.ComponentProps<typeof MenubarSubContent>


export {
  Menubar,
  MenubarPortal,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarGroup,
  MenubarSeparator,
  MenubarLabel,
  MenubarItem,
  MenubarShortcut,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
}
