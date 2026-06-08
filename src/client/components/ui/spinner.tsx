import { cn } from "@/lib/utils"
import { IconLoader } from "@tabler/icons-react"
import type * as React from "react"

/**
 * Spinner component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Spinner />
 * ```
 */
function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <IconLoader role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...props} />
  )
}
/**
 * Props for Spinner.
 *
 * @example
 * ```tsx
 * <Spinner />
 * ```
 */
export type SpinnerProps = React.ComponentProps<typeof Spinner>


export { Spinner }