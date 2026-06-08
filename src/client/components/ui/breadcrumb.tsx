import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"

import { cn } from "@/lib/utils"
import { IconChevronRight, IconDots } from "@tabler/icons-react"

/**
 * Breadcrumb component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Breadcrumb>
 *       <BreadcrumbList>
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Home</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Projects</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbPage>Design System</BreadcrumbPage>
 *         </BreadcrumbItem>
 *       </BreadcrumbList>
 *     </Breadcrumb>
 * ```
 */
function Breadcrumb({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      aria-label="breadcrumb"
      data-slot="breadcrumb"
      className={cn(className)}
      {...props}
    />
  )
}

/**
 * BreadcrumbList component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Breadcrumb>
 *       <BreadcrumbList>
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Home</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Projects</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbPage>Design System</BreadcrumbPage>
 *         </BreadcrumbItem>
 *       </BreadcrumbList>
 *     </Breadcrumb>
 * ```
 */
function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        "text-muted-foreground gap-1.5 text-sm flex flex-wrap items-center break-words",
        className
      )}
      {...props}
    />
  )
}

/**
 * BreadcrumbItem component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Breadcrumb>
 *       <BreadcrumbList>
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Home</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Projects</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbPage>Design System</BreadcrumbPage>
 *         </BreadcrumbItem>
 *       </BreadcrumbList>
 *     </Breadcrumb>
 * ```
 */
function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("gap-1 inline-flex items-center", className)}
      {...props}
    />
  )
}

/**
 * BreadcrumbLink component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Breadcrumb>
 *       <BreadcrumbList>
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Home</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Projects</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbPage>Design System</BreadcrumbPage>
 *         </BreadcrumbItem>
 *       </BreadcrumbList>
 *     </Breadcrumb>
 * ```
 */
function BreadcrumbLink({
  className,
  render,
  ...props
}: useRender.ComponentProps<"a">) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(
      {
        className: cn("hover:text-foreground transition-colors", className),
      },
      props
    ),
    render,
    state: {
      slot: "breadcrumb-link",
    },
  })
}

/**
 * BreadcrumbPage component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Breadcrumb>
 *       <BreadcrumbList>
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Home</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Projects</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbPage>Design System</BreadcrumbPage>
 *         </BreadcrumbItem>
 *       </BreadcrumbList>
 *     </Breadcrumb>
 * ```
 */
function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("text-foreground font-normal", className)}
      {...props}
    />
  )
}

/**
 * BreadcrumbSeparator component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Breadcrumb>
 *       <BreadcrumbList>
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Home</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Projects</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbPage>Design System</BreadcrumbPage>
 *         </BreadcrumbItem>
 *       </BreadcrumbList>
 *     </Breadcrumb>
 * ```
 */
function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("[&>svg]:size-3.5", className)}
      {...props}
    >
      {children ?? (
        <IconChevronRight
        />
      )}
    </li>
  )
}

/**
 * BreadcrumbEllipsis component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Breadcrumb>
 *       <BreadcrumbList>
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Home</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Projects</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbPage>Design System</BreadcrumbPage>
 *         </BreadcrumbItem>
 *       </BreadcrumbList>
 *     </Breadcrumb>
 * ```
 */
function BreadcrumbEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cn(
        "size-5 [&>svg]:size-4 flex items-center justify-center",
        className
      )}
      {...props}
    >
      <IconDots
      />
      <span className="sr-only">More</span>
    </span>
  )
}
/**
 * Props for Breadcrumb.
 *
 * @example
 * ```tsx
 * <Breadcrumb>
 *       <BreadcrumbList>
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Home</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Projects</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbPage>Design System</BreadcrumbPage>
 *         </BreadcrumbItem>
 *       </BreadcrumbList>
 *     </Breadcrumb>
 * ```
 */
export type BreadcrumbProps = React.ComponentProps<typeof Breadcrumb>

/**
 * Props for BreadcrumbList.
 *
 * @example
 * ```tsx
 * <Breadcrumb>
 *       <BreadcrumbList>
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Home</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Projects</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbPage>Design System</BreadcrumbPage>
 *         </BreadcrumbItem>
 *       </BreadcrumbList>
 *     </Breadcrumb>
 * ```
 */
export type BreadcrumbListProps = React.ComponentProps<typeof BreadcrumbList>

/**
 * Props for BreadcrumbItem.
 *
 * @example
 * ```tsx
 * <Breadcrumb>
 *       <BreadcrumbList>
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Home</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Projects</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbPage>Design System</BreadcrumbPage>
 *         </BreadcrumbItem>
 *       </BreadcrumbList>
 *     </Breadcrumb>
 * ```
 */
export type BreadcrumbItemProps = React.ComponentProps<typeof BreadcrumbItem>

/**
 * Props for BreadcrumbLink.
 *
 * @example
 * ```tsx
 * <Breadcrumb>
 *       <BreadcrumbList>
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Home</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Projects</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbPage>Design System</BreadcrumbPage>
 *         </BreadcrumbItem>
 *       </BreadcrumbList>
 *     </Breadcrumb>
 * ```
 */
export type BreadcrumbLinkProps = React.ComponentProps<typeof BreadcrumbLink>

/**
 * Props for BreadcrumbPage.
 *
 * @example
 * ```tsx
 * <Breadcrumb>
 *       <BreadcrumbList>
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Home</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Projects</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbPage>Design System</BreadcrumbPage>
 *         </BreadcrumbItem>
 *       </BreadcrumbList>
 *     </Breadcrumb>
 * ```
 */
export type BreadcrumbPageProps = React.ComponentProps<typeof BreadcrumbPage>

/**
 * Props for BreadcrumbSeparator.
 *
 * @example
 * ```tsx
 * <Breadcrumb>
 *       <BreadcrumbList>
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Home</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Projects</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbPage>Design System</BreadcrumbPage>
 *         </BreadcrumbItem>
 *       </BreadcrumbList>
 *     </Breadcrumb>
 * ```
 */
export type BreadcrumbSeparatorProps = React.ComponentProps<typeof BreadcrumbSeparator>

/**
 * Props for BreadcrumbEllipsis.
 *
 * @example
 * ```tsx
 * <Breadcrumb>
 *       <BreadcrumbList>
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Home</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbLink href="#">Projects</BreadcrumbLink>
 *         </BreadcrumbItem>
 *         <BreadcrumbSeparator />
 *         <BreadcrumbItem>
 *           <BreadcrumbPage>Design System</BreadcrumbPage>
 *         </BreadcrumbItem>
 *       </BreadcrumbList>
 *     </Breadcrumb>
 * ```
 */
export type BreadcrumbEllipsisProps = React.ComponentProps<typeof BreadcrumbEllipsis>


export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
}
