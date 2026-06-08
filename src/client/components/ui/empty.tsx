import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import type * as React from "react"

/**
 * Empty component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Empty>
 *       <EmptyHeader>
 *         <EmptyMedia variant="icon">
 *           <span className="text-xs">!</span>
 *         </EmptyMedia>
 *         <EmptyTitle>No projects yet</EmptyTitle>
 *         <EmptyDescription>
 *           Get started by creating your first project.
 *         </EmptyDescription>
 *       </EmptyHeader>
 *       <EmptyContent>
 *         <Button size="sm">Create project</Button>
 *       </EmptyContent>
 *     </Empty>
 * ```
 */
function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "gap-4 rounded-lg border-dashed p-6 flex w-full min-w-0 flex-1 flex-col items-center justify-center text-center text-balance",
        className
      )}
      {...props}
    />
  )
}

/**
 * EmptyHeader component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Empty>
 *       <EmptyHeader>
 *         <EmptyMedia variant="icon">
 *           <span className="text-xs">!</span>
 *         </EmptyMedia>
 *         <EmptyTitle>No projects yet</EmptyTitle>
 *         <EmptyDescription>
 *           Get started by creating your first project.
 *         </EmptyDescription>
 *       </EmptyHeader>
 *       <EmptyContent>
 *         <Button size="sm">Create project</Button>
 *       </EmptyContent>
 *     </Empty>
 * ```
 */
function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn(
        "gap-2 flex max-w-sm flex-col items-center",
        className
      )}
      {...props}
    />
  )
}

const emptyMediaVariants = cva(
  "mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

/**
 * EmptyMedia component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Empty>
 *       <EmptyHeader>
 *         <EmptyMedia variant="icon">
 *           <span className="text-xs">!</span>
 *         </EmptyMedia>
 *         <EmptyTitle>No projects yet</EmptyTitle>
 *         <EmptyDescription>
 *           Get started by creating your first project.
 *         </EmptyDescription>
 *       </EmptyHeader>
 *       <EmptyContent>
 *         <Button size="sm">Create project</Button>
 *       </EmptyContent>
 *     </Empty>
 * ```
 */
function EmptyMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  )
}

/**
 * EmptyTitle component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Empty>
 *       <EmptyHeader>
 *         <EmptyMedia variant="icon">
 *           <span className="text-xs">!</span>
 *         </EmptyMedia>
 *         <EmptyTitle>No projects yet</EmptyTitle>
 *         <EmptyDescription>
 *           Get started by creating your first project.
 *         </EmptyDescription>
 *       </EmptyHeader>
 *       <EmptyContent>
 *         <Button size="sm">Create project</Button>
 *       </EmptyContent>
 *     </Empty>
 * ```
 */
function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-title"
      className={cn("text-sm font-medium tracking-tight", className)}
      {...props}
    />
  )
}

/**
 * EmptyDescription component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Empty>
 *       <EmptyHeader>
 *         <EmptyMedia variant="icon">
 *           <span className="text-xs">!</span>
 *         </EmptyMedia>
 *         <EmptyTitle>No projects yet</EmptyTitle>
 *         <EmptyDescription>
 *           Get started by creating your first project.
 *         </EmptyDescription>
 *       </EmptyHeader>
 *       <EmptyContent>
 *         <Button size="sm">Create project</Button>
 *       </EmptyContent>
 *     </Empty>
 * ```
 */
function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        "text-sm/relaxed text-muted-foreground [&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4",
        className
      )}
      {...props}
    />
  )
}

/**
 * EmptyContent component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Empty>
 *       <EmptyHeader>
 *         <EmptyMedia variant="icon">
 *           <span className="text-xs">!</span>
 *         </EmptyMedia>
 *         <EmptyTitle>No projects yet</EmptyTitle>
 *         <EmptyDescription>
 *           Get started by creating your first project.
 *         </EmptyDescription>
 *       </EmptyHeader>
 *       <EmptyContent>
 *         <Button size="sm">Create project</Button>
 *       </EmptyContent>
 *     </Empty>
 * ```
 */
function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        "gap-2.5 text-sm flex w-full max-w-sm min-w-0 flex-col items-center text-balance",
        className
      )}
      {...props}
    />
  )
}
/**
 * Props for Empty.
 *
 * @example
 * ```tsx
 * <Empty>
 *       <EmptyHeader>
 *         <EmptyMedia variant="icon">
 *           <span className="text-xs">!</span>
 *         </EmptyMedia>
 *         <EmptyTitle>No projects yet</EmptyTitle>
 *         <EmptyDescription>
 *           Get started by creating your first project.
 *         </EmptyDescription>
 *       </EmptyHeader>
 *       <EmptyContent>
 *         <Button size="sm">Create project</Button>
 *       </EmptyContent>
 *     </Empty>
 * ```
 */
export type EmptyProps = React.ComponentProps<typeof Empty>

/**
 * Props for EmptyHeader.
 *
 * @example
 * ```tsx
 * <Empty>
 *       <EmptyHeader>
 *         <EmptyMedia variant="icon">
 *           <span className="text-xs">!</span>
 *         </EmptyMedia>
 *         <EmptyTitle>No projects yet</EmptyTitle>
 *         <EmptyDescription>
 *           Get started by creating your first project.
 *         </EmptyDescription>
 *       </EmptyHeader>
 *       <EmptyContent>
 *         <Button size="sm">Create project</Button>
 *       </EmptyContent>
 *     </Empty>
 * ```
 */
export type EmptyHeaderProps = React.ComponentProps<typeof EmptyHeader>

/**
 * Props for EmptyMedia.
 *
 * @example
 * ```tsx
 * <Empty>
 *       <EmptyHeader>
 *         <EmptyMedia variant="icon">
 *           <span className="text-xs">!</span>
 *         </EmptyMedia>
 *         <EmptyTitle>No projects yet</EmptyTitle>
 *         <EmptyDescription>
 *           Get started by creating your first project.
 *         </EmptyDescription>
 *       </EmptyHeader>
 *       <EmptyContent>
 *         <Button size="sm">Create project</Button>
 *       </EmptyContent>
 *     </Empty>
 * ```
 */
export type EmptyMediaProps = React.ComponentProps<typeof EmptyMedia>

/**
 * Props for EmptyTitle.
 *
 * @example
 * ```tsx
 * <Empty>
 *       <EmptyHeader>
 *         <EmptyMedia variant="icon">
 *           <span className="text-xs">!</span>
 *         </EmptyMedia>
 *         <EmptyTitle>No projects yet</EmptyTitle>
 *         <EmptyDescription>
 *           Get started by creating your first project.
 *         </EmptyDescription>
 *       </EmptyHeader>
 *       <EmptyContent>
 *         <Button size="sm">Create project</Button>
 *       </EmptyContent>
 *     </Empty>
 * ```
 */
export type EmptyTitleProps = React.ComponentProps<typeof EmptyTitle>

/**
 * Props for EmptyDescription.
 *
 * @example
 * ```tsx
 * <Empty>
 *       <EmptyHeader>
 *         <EmptyMedia variant="icon">
 *           <span className="text-xs">!</span>
 *         </EmptyMedia>
 *         <EmptyTitle>No projects yet</EmptyTitle>
 *         <EmptyDescription>
 *           Get started by creating your first project.
 *         </EmptyDescription>
 *       </EmptyHeader>
 *       <EmptyContent>
 *         <Button size="sm">Create project</Button>
 *       </EmptyContent>
 *     </Empty>
 * ```
 */
export type EmptyDescriptionProps = React.ComponentProps<typeof EmptyDescription>

/**
 * Props for EmptyContent.
 *
 * @example
 * ```tsx
 * <Empty>
 *       <EmptyHeader>
 *         <EmptyMedia variant="icon">
 *           <span className="text-xs">!</span>
 *         </EmptyMedia>
 *         <EmptyTitle>No projects yet</EmptyTitle>
 *         <EmptyDescription>
 *           Get started by creating your first project.
 *         </EmptyDescription>
 *       </EmptyHeader>
 *       <EmptyContent>
 *         <Button size="sm">Create project</Button>
 *       </EmptyContent>
 *     </Empty>
 * ```
 */
export type EmptyContentProps = React.ComponentProps<typeof EmptyContent>


export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
}