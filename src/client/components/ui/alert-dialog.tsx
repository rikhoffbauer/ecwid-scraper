import * as React from "react"
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * AlertDialog component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <AlertDialog>
 *       <AlertDialogTrigger render={<Button />}>Open dialog</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>Delete project?</AlertDialogTitle>
 *           <AlertDialogDescription>
 *             This action cannot be undone. This will permanently delete the
 *             project.
 *           </AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction>Delete</AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 * ```
 */
function AlertDialog({ ...props }: AlertDialogPrimitive.Root.Props) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

/**
 * AlertDialogTrigger component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <AlertDialog>
 *       <AlertDialogTrigger render={<Button />}>Open dialog</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>Delete project?</AlertDialogTitle>
 *           <AlertDialogDescription>
 *             This action cannot be undone. This will permanently delete the
 *             project.
 *           </AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction>Delete</AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 * ```
 */
function AlertDialogTrigger({ ...props }: AlertDialogPrimitive.Trigger.Props) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  )
}

/**
 * AlertDialogPortal component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <AlertDialog>
 *       <AlertDialogTrigger render={<Button />}>Open dialog</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>Delete project?</AlertDialogTitle>
 *           <AlertDialogDescription>
 *             This action cannot be undone. This will permanently delete the
 *             project.
 *           </AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction>Delete</AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 * ```
 */
function AlertDialogPortal({ ...props }: AlertDialogPrimitive.Portal.Props) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  )
}

/**
 * AlertDialogOverlay component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <AlertDialog>
 *       <AlertDialogTrigger render={<Button />}>Open dialog</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>Delete project?</AlertDialogTitle>
 *           <AlertDialogDescription>
 *             This action cannot be undone. This will permanently delete the
 *             project.
 *           </AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction>Delete</AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 * ```
 */
function AlertDialogOverlay({
  className,
  ...props
}: AlertDialogPrimitive.Backdrop.Props) {
  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-overlay"
      className={cn(
        "data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs fixed inset-0 isolate z-50",
        className
      )}
      {...props}
    />
  )
}

/**
 * AlertDialogContent component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <AlertDialog>
 *       <AlertDialogTrigger render={<Button />}>Open dialog</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>Delete project?</AlertDialogTitle>
 *           <AlertDialogDescription>
 *             This action cannot be undone. This will permanently delete the
 *             project.
 *           </AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction>Delete</AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 * ```
 */
function AlertDialogContent({
  className,
  size = "default",
  ...props
}: AlertDialogPrimitive.Popup.Props & {
  size?: "default" | "sm"
}) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        data-size={size}
        className={cn(
          "data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 bg-background ring-foreground/10 gap-4 rounded-xl p-4 ring-1 duration-100 data-[size=default]:max-w-xs data-[size=sm]:max-w-xs data-[size=default]:sm:max-w-sm group/alert-dialog-content fixed top-1/2 left-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 outline-none",
          className
        )}
        {...props}
      />
    </AlertDialogPortal>
  )
}

/**
 * AlertDialogHeader component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <AlertDialog>
 *       <AlertDialogTrigger render={<Button />}>Open dialog</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>Delete project?</AlertDialogTitle>
 *           <AlertDialogDescription>
 *             This action cannot be undone. This will permanently delete the
 *             project.
 *           </AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction>Delete</AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 * ```
 */
function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-4 sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]", className)}
      {...props}
    />
  )
}

/**
 * AlertDialogFooter component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <AlertDialog>
 *       <AlertDialogTrigger render={<Button />}>Open dialog</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>Delete project?</AlertDialogTitle>
 *           <AlertDialogDescription>
 *             This action cannot be undone. This will permanently delete the
 *             project.
 *           </AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction>Delete</AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 * ```
 */
function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "bg-muted/50 -mx-4 -mb-4 rounded-b-xl border-t p-4 flex flex-col-reverse gap-2 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

/**
 * AlertDialogMedia component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <AlertDialog>
 *       <AlertDialogTrigger render={<Button />}>Open dialog</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>Delete project?</AlertDialogTitle>
 *           <AlertDialogDescription>
 *             This action cannot be undone. This will permanently delete the
 *             project.
 *           </AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction>Delete</AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 * ```
 */
function AlertDialogMedia({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-media"
      className={cn("bg-muted mb-2 inline-flex size-10 items-center justify-center rounded-md sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-6", className)}
      {...props}
    />
  )
}

/**
 * AlertDialogTitle component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <AlertDialog>
 *       <AlertDialogTrigger render={<Button />}>Open dialog</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>Delete project?</AlertDialogTitle>
 *           <AlertDialogDescription>
 *             This action cannot be undone. This will permanently delete the
 *             project.
 *           </AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction>Delete</AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 * ```
 */
function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-sm font-medium sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2", className)}
      {...props}
    />
  )
}

/**
 * AlertDialogDescription component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <AlertDialog>
 *       <AlertDialogTrigger render={<Button />}>Open dialog</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>Delete project?</AlertDialogTitle>
 *           <AlertDialogDescription>
 *             This action cannot be undone. This will permanently delete the
 *             project.
 *           </AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction>Delete</AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 * ```
 */
function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-muted-foreground *:[a]:hover:text-foreground text-sm text-balance md:text-pretty *:[a]:underline *:[a]:underline-offset-3", className)}
      {...props}
    />
  )
}

/**
 * AlertDialogAction component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <AlertDialog>
 *       <AlertDialogTrigger render={<Button />}>Open dialog</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>Delete project?</AlertDialogTitle>
 *           <AlertDialogDescription>
 *             This action cannot be undone. This will permanently delete the
 *             project.
 *           </AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction>Delete</AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 * ```
 */
function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="alert-dialog-action"
      className={cn(className)}
      {...props}
    />
  )
}

/**
 * AlertDialogCancel component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <AlertDialog>
 *       <AlertDialogTrigger render={<Button />}>Open dialog</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>Delete project?</AlertDialogTitle>
 *           <AlertDialogDescription>
 *             This action cannot be undone. This will permanently delete the
 *             project.
 *           </AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction>Delete</AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 * ```
 */
function AlertDialogCancel({
  className,
  variant = "outline",
  size = "default",
  ...props
}: AlertDialogPrimitive.Close.Props &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      className={cn(className)}
      render={<Button variant={variant} size={size} />}
      {...props}
    />
  )
}
/**
 * Props for AlertDialog.
 *
 * @example
 * ```tsx
 * <AlertDialog>
 *       <AlertDialogTrigger render={<Button />}>Open dialog</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>Delete project?</AlertDialogTitle>
 *           <AlertDialogDescription>
 *             This action cannot be undone. This will permanently delete the
 *             project.
 *           </AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction>Delete</AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 * ```
 */
export type AlertDialogProps = React.ComponentProps<typeof AlertDialog>

/**
 * Props for AlertDialogTrigger.
 *
 * @example
 * ```tsx
 * <AlertDialog>
 *       <AlertDialogTrigger render={<Button />}>Open dialog</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>Delete project?</AlertDialogTitle>
 *           <AlertDialogDescription>
 *             This action cannot be undone. This will permanently delete the
 *             project.
 *           </AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction>Delete</AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 * ```
 */
export type AlertDialogTriggerProps = React.ComponentProps<typeof AlertDialogTrigger>

/**
 * Props for AlertDialogPortal.
 *
 * @example
 * ```tsx
 * <AlertDialog>
 *       <AlertDialogTrigger render={<Button />}>Open dialog</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>Delete project?</AlertDialogTitle>
 *           <AlertDialogDescription>
 *             This action cannot be undone. This will permanently delete the
 *             project.
 *           </AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction>Delete</AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 * ```
 */
export type AlertDialogPortalProps = React.ComponentProps<typeof AlertDialogPortal>

/**
 * Props for AlertDialogOverlay.
 *
 * @example
 * ```tsx
 * <AlertDialog>
 *       <AlertDialogTrigger render={<Button />}>Open dialog</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>Delete project?</AlertDialogTitle>
 *           <AlertDialogDescription>
 *             This action cannot be undone. This will permanently delete the
 *             project.
 *           </AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction>Delete</AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 * ```
 */
export type AlertDialogOverlayProps = React.ComponentProps<typeof AlertDialogOverlay>

/**
 * Props for AlertDialogContent.
 *
 * @example
 * ```tsx
 * <AlertDialog>
 *       <AlertDialogTrigger render={<Button />}>Open dialog</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>Delete project?</AlertDialogTitle>
 *           <AlertDialogDescription>
 *             This action cannot be undone. This will permanently delete the
 *             project.
 *           </AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction>Delete</AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 * ```
 */
export type AlertDialogContentProps = React.ComponentProps<typeof AlertDialogContent>

/**
 * Props for AlertDialogHeader.
 *
 * @example
 * ```tsx
 * <AlertDialog>
 *       <AlertDialogTrigger render={<Button />}>Open dialog</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>Delete project?</AlertDialogTitle>
 *           <AlertDialogDescription>
 *             This action cannot be undone. This will permanently delete the
 *             project.
 *           </AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction>Delete</AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 * ```
 */
export type AlertDialogHeaderProps = React.ComponentProps<typeof AlertDialogHeader>

/**
 * Props for AlertDialogFooter.
 *
 * @example
 * ```tsx
 * <AlertDialog>
 *       <AlertDialogTrigger render={<Button />}>Open dialog</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>Delete project?</AlertDialogTitle>
 *           <AlertDialogDescription>
 *             This action cannot be undone. This will permanently delete the
 *             project.
 *           </AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction>Delete</AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 * ```
 */
export type AlertDialogFooterProps = React.ComponentProps<typeof AlertDialogFooter>

/**
 * Props for AlertDialogMedia.
 *
 * @example
 * ```tsx
 * <AlertDialog>
 *       <AlertDialogTrigger render={<Button />}>Open dialog</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>Delete project?</AlertDialogTitle>
 *           <AlertDialogDescription>
 *             This action cannot be undone. This will permanently delete the
 *             project.
 *           </AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction>Delete</AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 * ```
 */
export type AlertDialogMediaProps = React.ComponentProps<typeof AlertDialogMedia>

/**
 * Props for AlertDialogTitle.
 *
 * @example
 * ```tsx
 * <AlertDialog>
 *       <AlertDialogTrigger render={<Button />}>Open dialog</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>Delete project?</AlertDialogTitle>
 *           <AlertDialogDescription>
 *             This action cannot be undone. This will permanently delete the
 *             project.
 *           </AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction>Delete</AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 * ```
 */
export type AlertDialogTitleProps = React.ComponentProps<typeof AlertDialogTitle>

/**
 * Props for AlertDialogDescription.
 *
 * @example
 * ```tsx
 * <AlertDialog>
 *       <AlertDialogTrigger render={<Button />}>Open dialog</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>Delete project?</AlertDialogTitle>
 *           <AlertDialogDescription>
 *             This action cannot be undone. This will permanently delete the
 *             project.
 *           </AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction>Delete</AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 * ```
 */
export type AlertDialogDescriptionProps = React.ComponentProps<typeof AlertDialogDescription>

/**
 * Props for AlertDialogAction.
 *
 * @example
 * ```tsx
 * <AlertDialog>
 *       <AlertDialogTrigger render={<Button />}>Open dialog</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>Delete project?</AlertDialogTitle>
 *           <AlertDialogDescription>
 *             This action cannot be undone. This will permanently delete the
 *             project.
 *           </AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction>Delete</AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 * ```
 */
export type AlertDialogActionProps = React.ComponentProps<typeof AlertDialogAction>

/**
 * Props for AlertDialogCancel.
 *
 * @example
 * ```tsx
 * <AlertDialog>
 *       <AlertDialogTrigger render={<Button />}>Open dialog</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>Delete project?</AlertDialogTitle>
 *           <AlertDialogDescription>
 *             This action cannot be undone. This will permanently delete the
 *             project.
 *           </AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction>Delete</AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 * ```
 */
export type AlertDialogCancelProps = React.ComponentProps<typeof AlertDialogCancel>


export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
}
