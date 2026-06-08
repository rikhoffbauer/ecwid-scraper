"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Label component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Label>Email address</Label>
 * ```
 */
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "gap-2 text-sm leading-none font-medium group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50 flex items-center select-none group-data-[disabled=true]:pointer-events-none peer-disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  )
}
/**
 * Props for Label.
 *
 * @example
 * ```tsx
 * <Label>Email address</Label>
 * ```
 */
export type LabelProps = React.ComponentProps<typeof Label>


export { Label }
