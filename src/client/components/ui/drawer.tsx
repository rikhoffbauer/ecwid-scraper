"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"

import { cn } from "@/lib/utils"

/**
 * Drawer component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Drawer>
 *       <DrawerTrigger className="inline-flex" asChild>
 *         <Button>Open drawer</Button>
 *       </DrawerTrigger>
 *       <DrawerContent>
 *         <DrawerHeader>
 *           <DrawerTitle>Quick actions</DrawerTitle>
 *           <DrawerDescription>Manage your workspace settings.</DrawerDescription>
 *         </DrawerHeader>
 *         <DrawerFooter>
 *           <DrawerClose asChild>
 *             <Button variant="outline">Close</Button>
 *           </DrawerClose>
 *         </DrawerFooter>
 *       </DrawerContent>
 *     </Drawer>
 * ```
 */
function Drawer({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />
}

/**
 * DrawerTrigger component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Drawer>
 *       <DrawerTrigger className="inline-flex" asChild>
 *         <Button>Open drawer</Button>
 *       </DrawerTrigger>
 *       <DrawerContent>
 *         <DrawerHeader>
 *           <DrawerTitle>Quick actions</DrawerTitle>
 *           <DrawerDescription>Manage your workspace settings.</DrawerDescription>
 *         </DrawerHeader>
 *         <DrawerFooter>
 *           <DrawerClose asChild>
 *             <Button variant="outline">Close</Button>
 *           </DrawerClose>
 *         </DrawerFooter>
 *       </DrawerContent>
 *     </Drawer>
 * ```
 */
function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

/**
 * DrawerPortal component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Drawer>
 *       <DrawerTrigger className="inline-flex" asChild>
 *         <Button>Open drawer</Button>
 *       </DrawerTrigger>
 *       <DrawerContent>
 *         <DrawerHeader>
 *           <DrawerTitle>Quick actions</DrawerTitle>
 *           <DrawerDescription>Manage your workspace settings.</DrawerDescription>
 *         </DrawerHeader>
 *         <DrawerFooter>
 *           <DrawerClose asChild>
 *             <Button variant="outline">Close</Button>
 *           </DrawerClose>
 *         </DrawerFooter>
 *       </DrawerContent>
 *     </Drawer>
 * ```
 */
function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

/**
 * DrawerClose component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Drawer>
 *       <DrawerTrigger className="inline-flex" asChild>
 *         <Button>Open drawer</Button>
 *       </DrawerTrigger>
 *       <DrawerContent>
 *         <DrawerHeader>
 *           <DrawerTitle>Quick actions</DrawerTitle>
 *           <DrawerDescription>Manage your workspace settings.</DrawerDescription>
 *         </DrawerHeader>
 *         <DrawerFooter>
 *           <DrawerClose asChild>
 *             <Button variant="outline">Close</Button>
 *           </DrawerClose>
 *         </DrawerFooter>
 *       </DrawerContent>
 *     </Drawer>
 * ```
 */
function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

/**
 * DrawerOverlay component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Drawer>
 *       <DrawerTrigger className="inline-flex" asChild>
 *         <Button>Open drawer</Button>
 *       </DrawerTrigger>
 *       <DrawerContent>
 *         <DrawerHeader>
 *           <DrawerTitle>Quick actions</DrawerTitle>
 *           <DrawerDescription>Manage your workspace settings.</DrawerDescription>
 *         </DrawerHeader>
 *         <DrawerFooter>
 *           <DrawerClose asChild>
 *             <Button variant="outline">Close</Button>
 *           </DrawerClose>
 *         </DrawerFooter>
 *       </DrawerContent>
 *     </Drawer>
 * ```
 */
function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn("data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-black/10 supports-backdrop-filter:backdrop-blur-xs fixed inset-0 z-50", className)}
      {...props}
    />
  )
}

/**
 * DrawerContent component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Drawer>
 *       <DrawerTrigger className="inline-flex" asChild>
 *         <Button>Open drawer</Button>
 *       </DrawerTrigger>
 *       <DrawerContent>
 *         <DrawerHeader>
 *           <DrawerTitle>Quick actions</DrawerTitle>
 *           <DrawerDescription>Manage your workspace settings.</DrawerDescription>
 *         </DrawerHeader>
 *         <DrawerFooter>
 *           <DrawerClose asChild>
 *             <Button variant="outline">Close</Button>
 *           </DrawerClose>
 *         </DrawerFooter>
 *       </DrawerContent>
 *     </Drawer>
 * ```
 */
function DrawerContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          "bg-background flex h-auto flex-col text-sm data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-xl data-[vaul-drawer-direction=bottom]:border-t data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:rounded-r-xl data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:rounded-l-xl data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-xl data-[vaul-drawer-direction=top]:border-b data-[vaul-drawer-direction=left]:sm:max-w-sm data-[vaul-drawer-direction=right]:sm:max-w-sm group/drawer-content fixed z-50",
          className
        )}
        {...props}
      >
        <div className="bg-muted mx-auto mt-4 hidden h-1 w-[100px] shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block bg-muted mx-auto hidden shrink-0 group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
}

/**
 * DrawerHeader component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Drawer>
 *       <DrawerTrigger className="inline-flex" asChild>
 *         <Button>Open drawer</Button>
 *       </DrawerTrigger>
 *       <DrawerContent>
 *         <DrawerHeader>
 *           <DrawerTitle>Quick actions</DrawerTitle>
 *           <DrawerDescription>Manage your workspace settings.</DrawerDescription>
 *         </DrawerHeader>
 *         <DrawerFooter>
 *           <DrawerClose asChild>
 *             <Button variant="outline">Close</Button>
 *           </DrawerClose>
 *         </DrawerFooter>
 *       </DrawerContent>
 *     </Drawer>
 * ```
 */
function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("gap-0.5 p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-0.5 md:text-left flex flex-col", className)}
      {...props}
    />
  )
}

/**
 * DrawerFooter component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Drawer>
 *       <DrawerTrigger className="inline-flex" asChild>
 *         <Button>Open drawer</Button>
 *       </DrawerTrigger>
 *       <DrawerContent>
 *         <DrawerHeader>
 *           <DrawerTitle>Quick actions</DrawerTitle>
 *           <DrawerDescription>Manage your workspace settings.</DrawerDescription>
 *         </DrawerHeader>
 *         <DrawerFooter>
 *           <DrawerClose asChild>
 *             <Button variant="outline">Close</Button>
 *           </DrawerClose>
 *         </DrawerFooter>
 *       </DrawerContent>
 *     </Drawer>
 * ```
 */
function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("gap-2 p-4 mt-auto flex flex-col", className)}
      {...props}
    />
  )
}

/**
 * DrawerTitle component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Drawer>
 *       <DrawerTrigger className="inline-flex" asChild>
 *         <Button>Open drawer</Button>
 *       </DrawerTrigger>
 *       <DrawerContent>
 *         <DrawerHeader>
 *           <DrawerTitle>Quick actions</DrawerTitle>
 *           <DrawerDescription>Manage your workspace settings.</DrawerDescription>
 *         </DrawerHeader>
 *         <DrawerFooter>
 *           <DrawerClose asChild>
 *             <Button variant="outline">Close</Button>
 *           </DrawerClose>
 *         </DrawerFooter>
 *       </DrawerContent>
 *     </Drawer>
 * ```
 */
function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-foreground text-base font-medium", className)}
      {...props}
    />
  )
}

/**
 * DrawerDescription component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Drawer>
 *       <DrawerTrigger className="inline-flex" asChild>
 *         <Button>Open drawer</Button>
 *       </DrawerTrigger>
 *       <DrawerContent>
 *         <DrawerHeader>
 *           <DrawerTitle>Quick actions</DrawerTitle>
 *           <DrawerDescription>Manage your workspace settings.</DrawerDescription>
 *         </DrawerHeader>
 *         <DrawerFooter>
 *           <DrawerClose asChild>
 *             <Button variant="outline">Close</Button>
 *           </DrawerClose>
 *         </DrawerFooter>
 *       </DrawerContent>
 *     </Drawer>
 * ```
 */
function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}
/**
 * Props for Drawer.
 *
 * @example
 * ```tsx
 * <Drawer>
 *       <DrawerTrigger className="inline-flex" asChild>
 *         <Button>Open drawer</Button>
 *       </DrawerTrigger>
 *       <DrawerContent>
 *         <DrawerHeader>
 *           <DrawerTitle>Quick actions</DrawerTitle>
 *           <DrawerDescription>Manage your workspace settings.</DrawerDescription>
 *         </DrawerHeader>
 *         <DrawerFooter>
 *           <DrawerClose asChild>
 *             <Button variant="outline">Close</Button>
 *           </DrawerClose>
 *         </DrawerFooter>
 *       </DrawerContent>
 *     </Drawer>
 * ```
 */
export type DrawerProps = React.ComponentProps<typeof Drawer>

/**
 * Props for DrawerTrigger.
 *
 * @example
 * ```tsx
 * <Drawer>
 *       <DrawerTrigger className="inline-flex" asChild>
 *         <Button>Open drawer</Button>
 *       </DrawerTrigger>
 *       <DrawerContent>
 *         <DrawerHeader>
 *           <DrawerTitle>Quick actions</DrawerTitle>
 *           <DrawerDescription>Manage your workspace settings.</DrawerDescription>
 *         </DrawerHeader>
 *         <DrawerFooter>
 *           <DrawerClose asChild>
 *             <Button variant="outline">Close</Button>
 *           </DrawerClose>
 *         </DrawerFooter>
 *       </DrawerContent>
 *     </Drawer>
 * ```
 */
export type DrawerTriggerProps = React.ComponentProps<typeof DrawerTrigger>

/**
 * Props for DrawerPortal.
 *
 * @example
 * ```tsx
 * <Drawer>
 *       <DrawerTrigger className="inline-flex" asChild>
 *         <Button>Open drawer</Button>
 *       </DrawerTrigger>
 *       <DrawerContent>
 *         <DrawerHeader>
 *           <DrawerTitle>Quick actions</DrawerTitle>
 *           <DrawerDescription>Manage your workspace settings.</DrawerDescription>
 *         </DrawerHeader>
 *         <DrawerFooter>
 *           <DrawerClose asChild>
 *             <Button variant="outline">Close</Button>
 *           </DrawerClose>
 *         </DrawerFooter>
 *       </DrawerContent>
 *     </Drawer>
 * ```
 */
export type DrawerPortalProps = React.ComponentProps<typeof DrawerPortal>

/**
 * Props for DrawerClose.
 *
 * @example
 * ```tsx
 * <Drawer>
 *       <DrawerTrigger className="inline-flex" asChild>
 *         <Button>Open drawer</Button>
 *       </DrawerTrigger>
 *       <DrawerContent>
 *         <DrawerHeader>
 *           <DrawerTitle>Quick actions</DrawerTitle>
 *           <DrawerDescription>Manage your workspace settings.</DrawerDescription>
 *         </DrawerHeader>
 *         <DrawerFooter>
 *           <DrawerClose asChild>
 *             <Button variant="outline">Close</Button>
 *           </DrawerClose>
 *         </DrawerFooter>
 *       </DrawerContent>
 *     </Drawer>
 * ```
 */
export type DrawerCloseProps = React.ComponentProps<typeof DrawerClose>

/**
 * Props for DrawerOverlay.
 *
 * @example
 * ```tsx
 * <Drawer>
 *       <DrawerTrigger className="inline-flex" asChild>
 *         <Button>Open drawer</Button>
 *       </DrawerTrigger>
 *       <DrawerContent>
 *         <DrawerHeader>
 *           <DrawerTitle>Quick actions</DrawerTitle>
 *           <DrawerDescription>Manage your workspace settings.</DrawerDescription>
 *         </DrawerHeader>
 *         <DrawerFooter>
 *           <DrawerClose asChild>
 *             <Button variant="outline">Close</Button>
 *           </DrawerClose>
 *         </DrawerFooter>
 *       </DrawerContent>
 *     </Drawer>
 * ```
 */
export type DrawerOverlayProps = React.ComponentProps<typeof DrawerOverlay>

/**
 * Props for DrawerContent.
 *
 * @example
 * ```tsx
 * <Drawer>
 *       <DrawerTrigger className="inline-flex" asChild>
 *         <Button>Open drawer</Button>
 *       </DrawerTrigger>
 *       <DrawerContent>
 *         <DrawerHeader>
 *           <DrawerTitle>Quick actions</DrawerTitle>
 *           <DrawerDescription>Manage your workspace settings.</DrawerDescription>
 *         </DrawerHeader>
 *         <DrawerFooter>
 *           <DrawerClose asChild>
 *             <Button variant="outline">Close</Button>
 *           </DrawerClose>
 *         </DrawerFooter>
 *       </DrawerContent>
 *     </Drawer>
 * ```
 */
export type DrawerContentProps = React.ComponentProps<typeof DrawerContent>

/**
 * Props for DrawerHeader.
 *
 * @example
 * ```tsx
 * <Drawer>
 *       <DrawerTrigger className="inline-flex" asChild>
 *         <Button>Open drawer</Button>
 *       </DrawerTrigger>
 *       <DrawerContent>
 *         <DrawerHeader>
 *           <DrawerTitle>Quick actions</DrawerTitle>
 *           <DrawerDescription>Manage your workspace settings.</DrawerDescription>
 *         </DrawerHeader>
 *         <DrawerFooter>
 *           <DrawerClose asChild>
 *             <Button variant="outline">Close</Button>
 *           </DrawerClose>
 *         </DrawerFooter>
 *       </DrawerContent>
 *     </Drawer>
 * ```
 */
export type DrawerHeaderProps = React.ComponentProps<typeof DrawerHeader>

/**
 * Props for DrawerFooter.
 *
 * @example
 * ```tsx
 * <Drawer>
 *       <DrawerTrigger className="inline-flex" asChild>
 *         <Button>Open drawer</Button>
 *       </DrawerTrigger>
 *       <DrawerContent>
 *         <DrawerHeader>
 *           <DrawerTitle>Quick actions</DrawerTitle>
 *           <DrawerDescription>Manage your workspace settings.</DrawerDescription>
 *         </DrawerHeader>
 *         <DrawerFooter>
 *           <DrawerClose asChild>
 *             <Button variant="outline">Close</Button>
 *           </DrawerClose>
 *         </DrawerFooter>
 *       </DrawerContent>
 *     </Drawer>
 * ```
 */
export type DrawerFooterProps = React.ComponentProps<typeof DrawerFooter>

/**
 * Props for DrawerTitle.
 *
 * @example
 * ```tsx
 * <Drawer>
 *       <DrawerTrigger className="inline-flex" asChild>
 *         <Button>Open drawer</Button>
 *       </DrawerTrigger>
 *       <DrawerContent>
 *         <DrawerHeader>
 *           <DrawerTitle>Quick actions</DrawerTitle>
 *           <DrawerDescription>Manage your workspace settings.</DrawerDescription>
 *         </DrawerHeader>
 *         <DrawerFooter>
 *           <DrawerClose asChild>
 *             <Button variant="outline">Close</Button>
 *           </DrawerClose>
 *         </DrawerFooter>
 *       </DrawerContent>
 *     </Drawer>
 * ```
 */
export type DrawerTitleProps = React.ComponentProps<typeof DrawerTitle>

/**
 * Props for DrawerDescription.
 *
 * @example
 * ```tsx
 * <Drawer>
 *       <DrawerTrigger className="inline-flex" asChild>
 *         <Button>Open drawer</Button>
 *       </DrawerTrigger>
 *       <DrawerContent>
 *         <DrawerHeader>
 *           <DrawerTitle>Quick actions</DrawerTitle>
 *           <DrawerDescription>Manage your workspace settings.</DrawerDescription>
 *         </DrawerHeader>
 *         <DrawerFooter>
 *           <DrawerClose asChild>
 *             <Button variant="outline">Close</Button>
 *           </DrawerClose>
 *         </DrawerFooter>
 *       </DrawerContent>
 *     </Drawer>
 * ```
 */
export type DrawerDescriptionProps = React.ComponentProps<typeof DrawerDescription>


export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
