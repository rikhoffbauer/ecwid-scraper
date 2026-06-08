import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva("grid gap-0.5 rounded-lg border px-2.5 py-2 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4 w-full relative group/alert", {
  variants: {
    variant: {
      default: "bg-card text-card-foreground",
      destructive: "text-destructive bg-card *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

/**
 * Alert component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Alert className="max-w-md">
 *       <AlertTitle>Heads up</AlertTitle>
 *       <AlertDescription>
 *         Your trial ends in 3 days. Upgrade to keep access to features.
 *       </AlertDescription>
 *       <AlertAction>
 *         <Button size="sm">Upgrade</Button>
 *       </AlertAction>
 *     </Alert>
 * ```
 */
function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

/**
 * AlertTitle component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Alert className="max-w-md">
 *       <AlertTitle>Heads up</AlertTitle>
 *       <AlertDescription>
 *         Your trial ends in 3 days. Upgrade to keep access to features.
 *       </AlertDescription>
 *       <AlertAction>
 *         <Button size="sm">Upgrade</Button>
 *       </AlertAction>
 *     </Alert>
 * ```
 */
function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-medium group-has-[>svg]/alert:col-start-2 [&_a]:hover:text-foreground [&_a]:underline [&_a]:underline-offset-3",
        className
      )}
      {...props}
    />
  )
}

/**
 * AlertDescription component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Alert className="max-w-md">
 *       <AlertTitle>Heads up</AlertTitle>
 *       <AlertDescription>
 *         Your trial ends in 3 days. Upgrade to keep access to features.
 *       </AlertDescription>
 *       <AlertAction>
 *         <Button size="sm">Upgrade</Button>
 *       </AlertAction>
 *     </Alert>
 * ```
 */
function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground text-sm text-balance md:text-pretty [&_p:not(:last-child)]:mb-4 [&_a]:hover:text-foreground [&_a]:underline [&_a]:underline-offset-3",
        className
      )}
      {...props}
    />
  )
}

/**
 * AlertAction component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Alert className="max-w-md">
 *       <AlertTitle>Heads up</AlertTitle>
 *       <AlertDescription>
 *         Your trial ends in 3 days. Upgrade to keep access to features.
 *       </AlertDescription>
 *       <AlertAction>
 *         <Button size="sm">Upgrade</Button>
 *       </AlertAction>
 *     </Alert>
 * ```
 */
function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-2 right-2", className)}
      {...props}
    />
  )
}
/**
 * Props for Alert.
 *
 * @example
 * ```tsx
 * <Alert className="max-w-md">
 *       <AlertTitle>Heads up</AlertTitle>
 *       <AlertDescription>
 *         Your trial ends in 3 days. Upgrade to keep access to features.
 *       </AlertDescription>
 *       <AlertAction>
 *         <Button size="sm">Upgrade</Button>
 *       </AlertAction>
 *     </Alert>
 * ```
 */
export type AlertProps = React.ComponentProps<typeof Alert>

/**
 * Props for AlertTitle.
 *
 * @example
 * ```tsx
 * <Alert className="max-w-md">
 *       <AlertTitle>Heads up</AlertTitle>
 *       <AlertDescription>
 *         Your trial ends in 3 days. Upgrade to keep access to features.
 *       </AlertDescription>
 *       <AlertAction>
 *         <Button size="sm">Upgrade</Button>
 *       </AlertAction>
 *     </Alert>
 * ```
 */
export type AlertTitleProps = React.ComponentProps<typeof AlertTitle>

/**
 * Props for AlertDescription.
 *
 * @example
 * ```tsx
 * <Alert className="max-w-md">
 *       <AlertTitle>Heads up</AlertTitle>
 *       <AlertDescription>
 *         Your trial ends in 3 days. Upgrade to keep access to features.
 *       </AlertDescription>
 *       <AlertAction>
 *         <Button size="sm">Upgrade</Button>
 *       </AlertAction>
 *     </Alert>
 * ```
 */
export type AlertDescriptionProps = React.ComponentProps<typeof AlertDescription>

/**
 * Props for AlertAction.
 *
 * @example
 * ```tsx
 * <Alert className="max-w-md">
 *       <AlertTitle>Heads up</AlertTitle>
 *       <AlertDescription>
 *         Your trial ends in 3 days. Upgrade to keep access to features.
 *       </AlertDescription>
 *       <AlertAction>
 *         <Button size="sm">Upgrade</Button>
 *       </AlertAction>
 *     </Alert>
 * ```
 */
export type AlertActionProps = React.ComponentProps<typeof AlertAction>


export { Alert, AlertTitle, AlertDescription, AlertAction }
