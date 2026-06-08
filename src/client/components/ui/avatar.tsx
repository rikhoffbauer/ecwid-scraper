"use client"

import * as React from "react"
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar"

import { cn } from "@/lib/utils"

/**
 * Avatar component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Avatar>
 *       <AvatarImage
 *         src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=200&auto=format&fit=crop"
 *         alt="Portrait"
 *       />
 *       <AvatarFallback>RF</AvatarFallback>
 *     </Avatar>
 * ```
 */
function Avatar({
  className,
  size = "default",
  ...props
}: AvatarPrimitive.Root.Props & {
  size?: "default" | "sm" | "lg"
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "size-8 rounded-full after:rounded-full data-[size=lg]:size-10 data-[size=sm]:size-6 after:border-border group/avatar relative flex shrink-0 select-none after:absolute after:inset-0 after:border after:mix-blend-darken dark:after:mix-blend-lighten",
        className
      )}
      {...props}
    />
  )
}

/**
 * AvatarImage component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Avatar>
 *       <AvatarImage
 *         src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=200&auto=format&fit=crop"
 *         alt="Portrait"
 *       />
 *       <AvatarFallback>RF</AvatarFallback>
 *     </Avatar>
 * ```
 */
function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(
        "rounded-full aspect-square size-full object-cover",
        className
      )}
      {...props}
    />
  )
}

/**
 * AvatarFallback component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Avatar>
 *       <AvatarImage
 *         src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=200&auto=format&fit=crop"
 *         alt="Portrait"
 *       />
 *       <AvatarFallback>RF</AvatarFallback>
 *     </Avatar>
 * ```
 */
function AvatarFallback({
  className,
  ...props
}: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted text-muted-foreground rounded-full flex size-full items-center justify-center text-sm group-data-[size=sm]/avatar:text-xs",
        className
      )}
      {...props}
    />
  )
}

/**
 * AvatarBadge component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Avatar>
 *       <AvatarImage
 *         src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=200&auto=format&fit=crop"
 *         alt="Portrait"
 *       />
 *       <AvatarFallback>RF</AvatarFallback>
 *     </Avatar>
 * ```
 */
function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "bg-primary text-primary-foreground ring-background absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-blend-color ring-2 select-none",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        className
      )}
      {...props}
    />
  )
}

/**
 * AvatarGroup component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Avatar>
 *       <AvatarImage
 *         src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=200&auto=format&fit=crop"
 *         alt="Portrait"
 *       />
 *       <AvatarFallback>RF</AvatarFallback>
 *     </Avatar>
 * ```
 */
function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "*:data-[slot=avatar]:ring-background group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2",
        className
      )}
      {...props}
    />
  )
}

/**
 * AvatarGroupCount component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Avatar>
 *       <AvatarImage
 *         src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=200&auto=format&fit=crop"
 *         alt="Portrait"
 *       />
 *       <AvatarFallback>RF</AvatarFallback>
 *     </Avatar>
 * ```
 */
function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn("bg-muted text-muted-foreground size-8 rounded-full text-sm group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3 ring-background relative flex shrink-0 items-center justify-center ring-2", className)}
      {...props}
    />
  )
}
/**
 * Props for Avatar.
 *
 * @example
 * ```tsx
 * <Avatar>
 *       <AvatarImage
 *         src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=200&auto=format&fit=crop"
 *         alt="Portrait"
 *       />
 *       <AvatarFallback>RF</AvatarFallback>
 *     </Avatar>
 * ```
 */
export type AvatarProps = React.ComponentProps<typeof Avatar>

/**
 * Props for AvatarImage.
 *
 * @example
 * ```tsx
 * <Avatar>
 *       <AvatarImage
 *         src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=200&auto=format&fit=crop"
 *         alt="Portrait"
 *       />
 *       <AvatarFallback>RF</AvatarFallback>
 *     </Avatar>
 * ```
 */
export type AvatarImageProps = React.ComponentProps<typeof AvatarImage>

/**
 * Props for AvatarFallback.
 *
 * @example
 * ```tsx
 * <Avatar>
 *       <AvatarImage
 *         src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=200&auto=format&fit=crop"
 *         alt="Portrait"
 *       />
 *       <AvatarFallback>RF</AvatarFallback>
 *     </Avatar>
 * ```
 */
export type AvatarFallbackProps = React.ComponentProps<typeof AvatarFallback>

/**
 * Props for AvatarBadge.
 *
 * @example
 * ```tsx
 * <Avatar>
 *       <AvatarImage
 *         src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=200&auto=format&fit=crop"
 *         alt="Portrait"
 *       />
 *       <AvatarFallback>RF</AvatarFallback>
 *     </Avatar>
 * ```
 */
export type AvatarBadgeProps = React.ComponentProps<typeof AvatarBadge>

/**
 * Props for AvatarGroup.
 *
 * @example
 * ```tsx
 * <Avatar>
 *       <AvatarImage
 *         src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=200&auto=format&fit=crop"
 *         alt="Portrait"
 *       />
 *       <AvatarFallback>RF</AvatarFallback>
 *     </Avatar>
 * ```
 */
export type AvatarGroupProps = React.ComponentProps<typeof AvatarGroup>

/**
 * Props for AvatarGroupCount.
 *
 * @example
 * ```tsx
 * <Avatar>
 *       <AvatarImage
 *         src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=200&auto=format&fit=crop"
 *         alt="Portrait"
 *       />
 *       <AvatarFallback>RF</AvatarFallback>
 *     </Avatar>
 * ```
 */
export type AvatarGroupCountProps = React.ComponentProps<typeof AvatarGroupCount>


export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
}
