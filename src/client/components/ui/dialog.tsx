"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { IconX } from "@tabler/icons-react"

/**
 * Dialog component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Dialog>
 *       <DialogTrigger render={<Button />}>Open dialog</DialogTrigger>
 *       <DialogContent>
 *         <DialogHeader>
 *           <DialogTitle>Invite teammates</DialogTitle>
 *           <DialogDescription>
 *             Share this link with your team to join the workspace.
 *           </DialogDescription>
 *         </DialogHeader>
 *         <DialogFooter>
 *           <Button>Copy invite link</Button>
 *         </DialogFooter>
 *       </DialogContent>
 *     </Dialog>
 * ```
 */
function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

/**
 * DialogTrigger component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Dialog>
 *       <DialogTrigger render={<Button />}>Open dialog</DialogTrigger>
 *       <DialogContent>
 *         <DialogHeader>
 *           <DialogTitle>Invite teammates</DialogTitle>
 *           <DialogDescription>
 *             Share this link with your team to join the workspace.
 *           </DialogDescription>
 *         </DialogHeader>
 *         <DialogFooter>
 *           <Button>Copy invite link</Button>
 *         </DialogFooter>
 *       </DialogContent>
 *     </Dialog>
 * ```
 */
function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

/**
 * DialogPortal component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Dialog>
 *       <DialogTrigger render={<Button />}>Open dialog</DialogTrigger>
 *       <DialogContent>
 *         <DialogHeader>
 *           <DialogTitle>Invite teammates</DialogTitle>
 *           <DialogDescription>
 *             Share this link with your team to join the workspace.
 *           </DialogDescription>
 *         </DialogHeader>
 *         <DialogFooter>
 *           <Button>Copy invite link</Button>
 *         </DialogFooter>
 *       </DialogContent>
 *     </Dialog>
 * ```
 */
function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

/**
 * DialogClose component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Dialog>
 *       <DialogTrigger render={<Button />}>Open dialog</DialogTrigger>
 *       <DialogContent>
 *         <DialogHeader>
 *           <DialogTitle>Invite teammates</DialogTitle>
 *           <DialogDescription>
 *             Share this link with your team to join the workspace.
 *           </DialogDescription>
 *         </DialogHeader>
 *         <DialogFooter>
 *           <Button>Copy invite link</Button>
 *         </DialogFooter>
 *       </DialogContent>
 *     </Dialog>
 * ```
 */
function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

/**
 * DialogOverlay component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Dialog>
 *       <DialogTrigger render={<Button />}>Open dialog</DialogTrigger>
 *       <DialogContent>
 *         <DialogHeader>
 *           <DialogTitle>Invite teammates</DialogTitle>
 *           <DialogDescription>
 *             Share this link with your team to join the workspace.
 *           </DialogDescription>
 *         </DialogHeader>
 *         <DialogFooter>
 *           <Button>Copy invite link</Button>
 *         </DialogFooter>
 *       </DialogContent>
 *     </Dialog>
 * ```
 */
function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn("data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs fixed inset-0 isolate z-50", className)}
      {...props}
    />
  )
}

/**
 * DialogContent component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Dialog>
 *       <DialogTrigger render={<Button />}>Open dialog</DialogTrigger>
 *       <DialogContent>
 *         <DialogHeader>
 *           <DialogTitle>Invite teammates</DialogTitle>
 *           <DialogDescription>
 *             Share this link with your team to join the workspace.
 *           </DialogDescription>
 *         </DialogHeader>
 *         <DialogFooter>
 *           <Button>Copy invite link</Button>
 *         </DialogFooter>
 *       </DialogContent>
 *     </Dialog>
 * ```
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "bg-background data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 ring-foreground/10 grid max-w-[calc(100%-2rem)] gap-4 rounded-xl p-4 text-sm ring-1 duration-100 sm:max-w-sm fixed top-1/2 left-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 outline-none",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2"
                size="icon-sm"
              />
            }
          >
            <IconX
            />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

/**
 * DialogHeader component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Dialog>
 *       <DialogTrigger render={<Button />}>Open dialog</DialogTrigger>
 *       <DialogContent>
 *         <DialogHeader>
 *           <DialogTitle>Invite teammates</DialogTitle>
 *           <DialogDescription>
 *             Share this link with your team to join the workspace.
 *           </DialogDescription>
 *         </DialogHeader>
 *         <DialogFooter>
 *           <Button>Copy invite link</Button>
 *         </DialogFooter>
 *       </DialogContent>
 *     </Dialog>
 * ```
 */
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("gap-2 flex flex-col", className)}
      {...props}
    />
  )
}

/**
 * DialogFooter component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Dialog>
 *       <DialogTrigger render={<Button />}>Open dialog</DialogTrigger>
 *       <DialogContent>
 *         <DialogHeader>
 *           <DialogTitle>Invite teammates</DialogTitle>
 *           <DialogDescription>
 *             Share this link with your team to join the workspace.
 *           </DialogDescription>
 *         </DialogHeader>
 *         <DialogFooter>
 *           <Button>Copy invite link</Button>
 *         </DialogFooter>
 *       </DialogContent>
 *     </Dialog>
 * ```
 */
function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "bg-muted/50 -mx-4 -mb-4 rounded-b-xl border-t p-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

/**
 * DialogTitle component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Dialog>
 *       <DialogTrigger render={<Button />}>Open dialog</DialogTrigger>
 *       <DialogContent>
 *         <DialogHeader>
 *           <DialogTitle>Invite teammates</DialogTitle>
 *           <DialogDescription>
 *             Share this link with your team to join the workspace.
 *           </DialogDescription>
 *         </DialogHeader>
 *         <DialogFooter>
 *           <Button>Copy invite link</Button>
 *         </DialogFooter>
 *       </DialogContent>
 *     </Dialog>
 * ```
 */
function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-sm leading-none font-medium", className)}
      {...props}
    />
  )
}

/**
 * DialogDescription component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Dialog>
 *       <DialogTrigger render={<Button />}>Open dialog</DialogTrigger>
 *       <DialogContent>
 *         <DialogHeader>
 *           <DialogTitle>Invite teammates</DialogTitle>
 *           <DialogDescription>
 *             Share this link with your team to join the workspace.
 *           </DialogDescription>
 *         </DialogHeader>
 *         <DialogFooter>
 *           <Button>Copy invite link</Button>
 *         </DialogFooter>
 *       </DialogContent>
 *     </Dialog>
 * ```
 */
function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground *:[a]:hover:text-foreground text-sm *:[a]:underline *:[a]:underline-offset-3", className)}
      {...props}
    />
  )
}
/**
 * Props for Dialog.
 *
 * @example
 * ```tsx
 * <Dialog>
 *       <DialogTrigger render={<Button />}>Open dialog</DialogTrigger>
 *       <DialogContent>
 *         <DialogHeader>
 *           <DialogTitle>Invite teammates</DialogTitle>
 *           <DialogDescription>
 *             Share this link with your team to join the workspace.
 *           </DialogDescription>
 *         </DialogHeader>
 *         <DialogFooter>
 *           <Button>Copy invite link</Button>
 *         </DialogFooter>
 *       </DialogContent>
 *     </Dialog>
 * ```
 */
export type DialogProps = React.ComponentProps<typeof Dialog>

/**
 * Props for DialogTrigger.
 *
 * @example
 * ```tsx
 * <Dialog>
 *       <DialogTrigger render={<Button />}>Open dialog</DialogTrigger>
 *       <DialogContent>
 *         <DialogHeader>
 *           <DialogTitle>Invite teammates</DialogTitle>
 *           <DialogDescription>
 *             Share this link with your team to join the workspace.
 *           </DialogDescription>
 *         </DialogHeader>
 *         <DialogFooter>
 *           <Button>Copy invite link</Button>
 *         </DialogFooter>
 *       </DialogContent>
 *     </Dialog>
 * ```
 */
export type DialogTriggerProps = React.ComponentProps<typeof DialogTrigger>

/**
 * Props for DialogPortal.
 *
 * @example
 * ```tsx
 * <Dialog>
 *       <DialogTrigger render={<Button />}>Open dialog</DialogTrigger>
 *       <DialogContent>
 *         <DialogHeader>
 *           <DialogTitle>Invite teammates</DialogTitle>
 *           <DialogDescription>
 *             Share this link with your team to join the workspace.
 *           </DialogDescription>
 *         </DialogHeader>
 *         <DialogFooter>
 *           <Button>Copy invite link</Button>
 *         </DialogFooter>
 *       </DialogContent>
 *     </Dialog>
 * ```
 */
export type DialogPortalProps = React.ComponentProps<typeof DialogPortal>

/**
 * Props for DialogClose.
 *
 * @example
 * ```tsx
 * <Dialog>
 *       <DialogTrigger render={<Button />}>Open dialog</DialogTrigger>
 *       <DialogContent>
 *         <DialogHeader>
 *           <DialogTitle>Invite teammates</DialogTitle>
 *           <DialogDescription>
 *             Share this link with your team to join the workspace.
 *           </DialogDescription>
 *         </DialogHeader>
 *         <DialogFooter>
 *           <Button>Copy invite link</Button>
 *         </DialogFooter>
 *       </DialogContent>
 *     </Dialog>
 * ```
 */
export type DialogCloseProps = React.ComponentProps<typeof DialogClose>

/**
 * Props for DialogOverlay.
 *
 * @example
 * ```tsx
 * <Dialog>
 *       <DialogTrigger render={<Button />}>Open dialog</DialogTrigger>
 *       <DialogContent>
 *         <DialogHeader>
 *           <DialogTitle>Invite teammates</DialogTitle>
 *           <DialogDescription>
 *             Share this link with your team to join the workspace.
 *           </DialogDescription>
 *         </DialogHeader>
 *         <DialogFooter>
 *           <Button>Copy invite link</Button>
 *         </DialogFooter>
 *       </DialogContent>
 *     </Dialog>
 * ```
 */
export type DialogOverlayProps = React.ComponentProps<typeof DialogOverlay>

/**
 * Props for DialogContent.
 *
 * @example
 * ```tsx
 * <Dialog>
 *       <DialogTrigger render={<Button />}>Open dialog</DialogTrigger>
 *       <DialogContent>
 *         <DialogHeader>
 *           <DialogTitle>Invite teammates</DialogTitle>
 *           <DialogDescription>
 *             Share this link with your team to join the workspace.
 *           </DialogDescription>
 *         </DialogHeader>
 *         <DialogFooter>
 *           <Button>Copy invite link</Button>
 *         </DialogFooter>
 *       </DialogContent>
 *     </Dialog>
 * ```
 */
export type DialogContentProps = React.ComponentProps<typeof DialogContent>

/**
 * Props for DialogHeader.
 *
 * @example
 * ```tsx
 * <Dialog>
 *       <DialogTrigger render={<Button />}>Open dialog</DialogTrigger>
 *       <DialogContent>
 *         <DialogHeader>
 *           <DialogTitle>Invite teammates</DialogTitle>
 *           <DialogDescription>
 *             Share this link with your team to join the workspace.
 *           </DialogDescription>
 *         </DialogHeader>
 *         <DialogFooter>
 *           <Button>Copy invite link</Button>
 *         </DialogFooter>
 *       </DialogContent>
 *     </Dialog>
 * ```
 */
export type DialogHeaderProps = React.ComponentProps<typeof DialogHeader>

/**
 * Props for DialogFooter.
 *
 * @example
 * ```tsx
 * <Dialog>
 *       <DialogTrigger render={<Button />}>Open dialog</DialogTrigger>
 *       <DialogContent>
 *         <DialogHeader>
 *           <DialogTitle>Invite teammates</DialogTitle>
 *           <DialogDescription>
 *             Share this link with your team to join the workspace.
 *           </DialogDescription>
 *         </DialogHeader>
 *         <DialogFooter>
 *           <Button>Copy invite link</Button>
 *         </DialogFooter>
 *       </DialogContent>
 *     </Dialog>
 * ```
 */
export type DialogFooterProps = React.ComponentProps<typeof DialogFooter>

/**
 * Props for DialogTitle.
 *
 * @example
 * ```tsx
 * <Dialog>
 *       <DialogTrigger render={<Button />}>Open dialog</DialogTrigger>
 *       <DialogContent>
 *         <DialogHeader>
 *           <DialogTitle>Invite teammates</DialogTitle>
 *           <DialogDescription>
 *             Share this link with your team to join the workspace.
 *           </DialogDescription>
 *         </DialogHeader>
 *         <DialogFooter>
 *           <Button>Copy invite link</Button>
 *         </DialogFooter>
 *       </DialogContent>
 *     </Dialog>
 * ```
 */
export type DialogTitleProps = React.ComponentProps<typeof DialogTitle>

/**
 * Props for DialogDescription.
 *
 * @example
 * ```tsx
 * <Dialog>
 *       <DialogTrigger render={<Button />}>Open dialog</DialogTrigger>
 *       <DialogContent>
 *         <DialogHeader>
 *           <DialogTitle>Invite teammates</DialogTitle>
 *           <DialogDescription>
 *             Share this link with your team to join the workspace.
 *           </DialogDescription>
 *         </DialogHeader>
 *         <DialogFooter>
 *           <Button>Copy invite link</Button>
 *         </DialogFooter>
 *       </DialogContent>
 *     </Dialog>
 * ```
 */
export type DialogDescriptionProps = React.ComponentProps<typeof DialogDescription>


export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
