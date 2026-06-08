import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { IconChevronLeft, IconChevronRight, IconDots } from "@tabler/icons-react"

/**
 * Pagination component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Pagination>
 *       <PaginationContent>
 *         <PaginationItem>
 *           <PaginationPrevious href="#" />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#">1</PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#" isActive>
 *             2
 *           </PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationEllipsis />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationNext href="#" />
 *         </PaginationItem>
 *       </PaginationContent>
 *     </Pagination>
 * ```
 */
function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn(
        "mx-auto flex w-full justify-center",
        className
      )}
      {...props}
    />
  )
}

/**
 * PaginationContent component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Pagination>
 *       <PaginationContent>
 *         <PaginationItem>
 *           <PaginationPrevious href="#" />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#">1</PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#" isActive>
 *             2
 *           </PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationEllipsis />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationNext href="#" />
 *         </PaginationItem>
 *       </PaginationContent>
 *     </Pagination>
 * ```
 */
function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("gap-0.5 flex items-center", className)}
      {...props}
    />
  )
}

/**
 * PaginationItem component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Pagination>
 *       <PaginationContent>
 *         <PaginationItem>
 *           <PaginationPrevious href="#" />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#">1</PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#" isActive>
 *             2
 *           </PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationEllipsis />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationNext href="#" />
 *         </PaginationItem>
 *       </PaginationContent>
 *     </Pagination>
 * ```
 */
function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

/**
 * Props for PaginationLink.
 *
 * @example
 * ```tsx
 * <Pagination>
 *       <PaginationContent>
 *         <PaginationItem>
 *           <PaginationPrevious href="#" />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#">1</PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#" isActive>
 *             2
 *           </PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationEllipsis />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationNext href="#" />
 *         </PaginationItem>
 *       </PaginationContent>
 *     </Pagination>
 * ```
 */
export type PaginationLinkProps = {
  isActive?: boolean
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"a">

/**
 * PaginationLink component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Pagination>
 *       <PaginationContent>
 *         <PaginationItem>
 *           <PaginationPrevious href="#" />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#">1</PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#" isActive>
 *             2
 *           </PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationEllipsis />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationNext href="#" />
 *         </PaginationItem>
 *       </PaginationContent>
 *     </Pagination>
 * ```
 */
function PaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) {
  return (
    <Button
      variant={isActive ? "outline" : "ghost"}
      size={size}
      className={cn(className)}
      nativeButton={false}
      render={
        <a
          aria-current={isActive ? "page" : undefined}
          data-slot="pagination-link"
          data-active={isActive}
          {...props}
        />
      }
    />
  )
}

/**
 * PaginationPrevious component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Pagination>
 *       <PaginationContent>
 *         <PaginationItem>
 *           <PaginationPrevious href="#" />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#">1</PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#" isActive>
 *             2
 *           </PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationEllipsis />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationNext href="#" />
 *         </PaginationItem>
 *       </PaginationContent>
 *     </Pagination>
 * ```
 */
function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn("pl-1.5!", className)}
      {...props}
    >
      <IconChevronLeft data-icon="inline-start" />
      <span className="hidden sm:block">
        Previous
      </span>
    </PaginationLink>
  )
}

/**
 * PaginationNext component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Pagination>
 *       <PaginationContent>
 *         <PaginationItem>
 *           <PaginationPrevious href="#" />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#">1</PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#" isActive>
 *             2
 *           </PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationEllipsis />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationNext href="#" />
 *         </PaginationItem>
 *       </PaginationContent>
 *     </Pagination>
 * ```
 */
function PaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn("pr-1.5!", className)}
      {...props}
    >
      <span className="hidden sm:block">Next</span>
      <IconChevronRight data-icon="inline-end" />
    </PaginationLink>
  )
}

/**
 * PaginationEllipsis component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Pagination>
 *       <PaginationContent>
 *         <PaginationItem>
 *           <PaginationPrevious href="#" />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#">1</PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#" isActive>
 *             2
 *           </PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationEllipsis />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationNext href="#" />
 *         </PaginationItem>
 *       </PaginationContent>
 *     </Pagination>
 * ```
 */
function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn(
        "size-8 items-center justify-center [&_svg:not([class*='size-'])]:size-4 flex items-center justify-center",
        className
      )}
      {...props}
    >
      <IconDots
      />
      <span className="sr-only">More pages</span>
    </span>
  )
}
/**
 * Props for Pagination.
 *
 * @example
 * ```tsx
 * <Pagination>
 *       <PaginationContent>
 *         <PaginationItem>
 *           <PaginationPrevious href="#" />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#">1</PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#" isActive>
 *             2
 *           </PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationEllipsis />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationNext href="#" />
 *         </PaginationItem>
 *       </PaginationContent>
 *     </Pagination>
 * ```
 */
export type PaginationProps = React.ComponentProps<typeof Pagination>

/**
 * Props for PaginationContent.
 *
 * @example
 * ```tsx
 * <Pagination>
 *       <PaginationContent>
 *         <PaginationItem>
 *           <PaginationPrevious href="#" />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#">1</PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#" isActive>
 *             2
 *           </PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationEllipsis />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationNext href="#" />
 *         </PaginationItem>
 *       </PaginationContent>
 *     </Pagination>
 * ```
 */
export type PaginationContentProps = React.ComponentProps<typeof PaginationContent>

/**
 * Props for PaginationItem.
 *
 * @example
 * ```tsx
 * <Pagination>
 *       <PaginationContent>
 *         <PaginationItem>
 *           <PaginationPrevious href="#" />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#">1</PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#" isActive>
 *             2
 *           </PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationEllipsis />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationNext href="#" />
 *         </PaginationItem>
 *       </PaginationContent>
 *     </Pagination>
 * ```
 */
export type PaginationItemProps = React.ComponentProps<typeof PaginationItem>

/**
 * Props for PaginationPrevious.
 *
 * @example
 * ```tsx
 * <Pagination>
 *       <PaginationContent>
 *         <PaginationItem>
 *           <PaginationPrevious href="#" />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#">1</PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#" isActive>
 *             2
 *           </PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationEllipsis />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationNext href="#" />
 *         </PaginationItem>
 *       </PaginationContent>
 *     </Pagination>
 * ```
 */
export type PaginationPreviousProps = React.ComponentProps<typeof PaginationPrevious>

/**
 * Props for PaginationNext.
 *
 * @example
 * ```tsx
 * <Pagination>
 *       <PaginationContent>
 *         <PaginationItem>
 *           <PaginationPrevious href="#" />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#">1</PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#" isActive>
 *             2
 *           </PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationEllipsis />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationNext href="#" />
 *         </PaginationItem>
 *       </PaginationContent>
 *     </Pagination>
 * ```
 */
export type PaginationNextProps = React.ComponentProps<typeof PaginationNext>

/**
 * Props for PaginationEllipsis.
 *
 * @example
 * ```tsx
 * <Pagination>
 *       <PaginationContent>
 *         <PaginationItem>
 *           <PaginationPrevious href="#" />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#">1</PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationLink href="#" isActive>
 *             2
 *           </PaginationLink>
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationEllipsis />
 *         </PaginationItem>
 *         <PaginationItem>
 *           <PaginationNext href="#" />
 *         </PaginationItem>
 *       </PaginationContent>
 *     </Pagination>
 * ```
 */
export type PaginationEllipsisProps = React.ComponentProps<typeof PaginationEllipsis>


export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
