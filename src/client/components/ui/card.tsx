import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Card component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Card className="max-w-sm">
 *       <CardHeader>
 *         <CardTitle>Project Alpha</CardTitle>
 *         <CardDescription>Quick summary of the project status.</CardDescription>
 *       </CardHeader>
 *       <CardContent>
 *         <p className="text-sm text-muted-foreground">
 *           Last updated 2 hours ago. 3 tasks are overdue.
 *         </p>
 *       </CardContent>
 *       <CardFooter className="justify-end">
 *         <Button size="sm">View</Button>
 *       </CardFooter>
 *     </Card>
 * ```
 */
function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn("ring-foreground/10 bg-card text-card-foreground gap-4 overflow-hidden rounded-xl py-4 text-sm ring-1 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl group/card flex flex-col", className)}
      {...props}
    />
  )
}

/**
 * CardHeader component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Card className="max-w-sm">
 *       <CardHeader>
 *         <CardTitle>Project Alpha</CardTitle>
 *         <CardDescription>Quick summary of the project status.</CardDescription>
 *       </CardHeader>
 *       <CardContent>
 *         <p className="text-sm text-muted-foreground">
 *           Last updated 2 hours ago. 3 tasks are overdue.
 *         </p>
 *       </CardContent>
 *       <CardFooter className="justify-end">
 *         <Button size="sm">View</Button>
 *       </CardFooter>
 *     </Card>
 * ```
 */
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "gap-1 rounded-t-xl px-4 group-data-[size=sm]/card:px-3 [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3 group/card-header @container/card-header grid auto-rows-min items-start has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]",
        className
      )}
      {...props}
    />
  )
}

/**
 * CardTitle component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Card className="max-w-sm">
 *       <CardHeader>
 *         <CardTitle>Project Alpha</CardTitle>
 *         <CardDescription>Quick summary of the project status.</CardDescription>
 *       </CardHeader>
 *       <CardContent>
 *         <p className="text-sm text-muted-foreground">
 *           Last updated 2 hours ago. 3 tasks are overdue.
 *         </p>
 *       </CardContent>
 *       <CardFooter className="justify-end">
 *         <Button size="sm">View</Button>
 *       </CardFooter>
 *     </Card>
 * ```
 */
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-base leading-snug font-medium group-data-[size=sm]/card:text-sm", className)}
      {...props}
    />
  )
}

/**
 * CardDescription component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Card className="max-w-sm">
 *       <CardHeader>
 *         <CardTitle>Project Alpha</CardTitle>
 *         <CardDescription>Quick summary of the project status.</CardDescription>
 *       </CardHeader>
 *       <CardContent>
 *         <p className="text-sm text-muted-foreground">
 *           Last updated 2 hours ago. 3 tasks are overdue.
 *         </p>
 *       </CardContent>
 *       <CardFooter className="justify-end">
 *         <Button size="sm">View</Button>
 *       </CardFooter>
 *     </Card>
 * ```
 */
function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

/**
 * CardAction component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Card className="max-w-sm">
 *       <CardHeader>
 *         <CardTitle>Project Alpha</CardTitle>
 *         <CardDescription>Quick summary of the project status.</CardDescription>
 *       </CardHeader>
 *       <CardContent>
 *         <p className="text-sm text-muted-foreground">
 *           Last updated 2 hours ago. 3 tasks are overdue.
 *         </p>
 *       </CardContent>
 *       <CardFooter className="justify-end">
 *         <Button size="sm">View</Button>
 *       </CardFooter>
 *     </Card>
 * ```
 */
function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

/**
 * CardContent component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Card className="max-w-sm">
 *       <CardHeader>
 *         <CardTitle>Project Alpha</CardTitle>
 *         <CardDescription>Quick summary of the project status.</CardDescription>
 *       </CardHeader>
 *       <CardContent>
 *         <p className="text-sm text-muted-foreground">
 *           Last updated 2 hours ago. 3 tasks are overdue.
 *         </p>
 *       </CardContent>
 *       <CardFooter className="justify-end">
 *         <Button size="sm">View</Button>
 *       </CardFooter>
 *     </Card>
 * ```
 */
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 group-data-[size=sm]/card:px-3", className)}
      {...props}
    />
  )
}

/**
 * CardFooter component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Card className="max-w-sm">
 *       <CardHeader>
 *         <CardTitle>Project Alpha</CardTitle>
 *         <CardDescription>Quick summary of the project status.</CardDescription>
 *       </CardHeader>
 *       <CardContent>
 *         <p className="text-sm text-muted-foreground">
 *           Last updated 2 hours ago. 3 tasks are overdue.
 *         </p>
 *       </CardContent>
 *       <CardFooter className="justify-end">
 *         <Button size="sm">View</Button>
 *       </CardFooter>
 *     </Card>
 * ```
 */
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("bg-muted/50 rounded-b-xl border-t p-4 group-data-[size=sm]/card:p-3 flex items-center", className)}
      {...props}
    />
  )
}
/**
 * Props for Card.
 *
 * @example
 * ```tsx
 * <Card className="max-w-sm">
 *       <CardHeader>
 *         <CardTitle>Project Alpha</CardTitle>
 *         <CardDescription>Quick summary of the project status.</CardDescription>
 *       </CardHeader>
 *       <CardContent>
 *         <p className="text-sm text-muted-foreground">
 *           Last updated 2 hours ago. 3 tasks are overdue.
 *         </p>
 *       </CardContent>
 *       <CardFooter className="justify-end">
 *         <Button size="sm">View</Button>
 *       </CardFooter>
 *     </Card>
 * ```
 */
export type CardProps = React.ComponentProps<typeof Card>

/**
 * Props for CardHeader.
 *
 * @example
 * ```tsx
 * <Card className="max-w-sm">
 *       <CardHeader>
 *         <CardTitle>Project Alpha</CardTitle>
 *         <CardDescription>Quick summary of the project status.</CardDescription>
 *       </CardHeader>
 *       <CardContent>
 *         <p className="text-sm text-muted-foreground">
 *           Last updated 2 hours ago. 3 tasks are overdue.
 *         </p>
 *       </CardContent>
 *       <CardFooter className="justify-end">
 *         <Button size="sm">View</Button>
 *       </CardFooter>
 *     </Card>
 * ```
 */
export type CardHeaderProps = React.ComponentProps<typeof CardHeader>

/**
 * Props for CardTitle.
 *
 * @example
 * ```tsx
 * <Card className="max-w-sm">
 *       <CardHeader>
 *         <CardTitle>Project Alpha</CardTitle>
 *         <CardDescription>Quick summary of the project status.</CardDescription>
 *       </CardHeader>
 *       <CardContent>
 *         <p className="text-sm text-muted-foreground">
 *           Last updated 2 hours ago. 3 tasks are overdue.
 *         </p>
 *       </CardContent>
 *       <CardFooter className="justify-end">
 *         <Button size="sm">View</Button>
 *       </CardFooter>
 *     </Card>
 * ```
 */
export type CardTitleProps = React.ComponentProps<typeof CardTitle>

/**
 * Props for CardDescription.
 *
 * @example
 * ```tsx
 * <Card className="max-w-sm">
 *       <CardHeader>
 *         <CardTitle>Project Alpha</CardTitle>
 *         <CardDescription>Quick summary of the project status.</CardDescription>
 *       </CardHeader>
 *       <CardContent>
 *         <p className="text-sm text-muted-foreground">
 *           Last updated 2 hours ago. 3 tasks are overdue.
 *         </p>
 *       </CardContent>
 *       <CardFooter className="justify-end">
 *         <Button size="sm">View</Button>
 *       </CardFooter>
 *     </Card>
 * ```
 */
export type CardDescriptionProps = React.ComponentProps<typeof CardDescription>

/**
 * Props for CardAction.
 *
 * @example
 * ```tsx
 * <Card className="max-w-sm">
 *       <CardHeader>
 *         <CardTitle>Project Alpha</CardTitle>
 *         <CardDescription>Quick summary of the project status.</CardDescription>
 *       </CardHeader>
 *       <CardContent>
 *         <p className="text-sm text-muted-foreground">
 *           Last updated 2 hours ago. 3 tasks are overdue.
 *         </p>
 *       </CardContent>
 *       <CardFooter className="justify-end">
 *         <Button size="sm">View</Button>
 *       </CardFooter>
 *     </Card>
 * ```
 */
export type CardActionProps = React.ComponentProps<typeof CardAction>

/**
 * Props for CardContent.
 *
 * @example
 * ```tsx
 * <Card className="max-w-sm">
 *       <CardHeader>
 *         <CardTitle>Project Alpha</CardTitle>
 *         <CardDescription>Quick summary of the project status.</CardDescription>
 *       </CardHeader>
 *       <CardContent>
 *         <p className="text-sm text-muted-foreground">
 *           Last updated 2 hours ago. 3 tasks are overdue.
 *         </p>
 *       </CardContent>
 *       <CardFooter className="justify-end">
 *         <Button size="sm">View</Button>
 *       </CardFooter>
 *     </Card>
 * ```
 */
export type CardContentProps = React.ComponentProps<typeof CardContent>

/**
 * Props for CardFooter.
 *
 * @example
 * ```tsx
 * <Card className="max-w-sm">
 *       <CardHeader>
 *         <CardTitle>Project Alpha</CardTitle>
 *         <CardDescription>Quick summary of the project status.</CardDescription>
 *       </CardHeader>
 *       <CardContent>
 *         <p className="text-sm text-muted-foreground">
 *           Last updated 2 hours ago. 3 tasks are overdue.
 *         </p>
 *       </CardContent>
 *       <CardFooter className="justify-end">
 *         <Button size="sm">View</Button>
 *       </CardFooter>
 *     </Card>
 * ```
 */
export type CardFooterProps = React.ComponentProps<typeof CardFooter>


export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
