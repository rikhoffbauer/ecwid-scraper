"use client"

import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "@/lib/utils"
import type * as React from "react"

/**
 * Progress component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Progress value=60 />
 * ```
 */
function Progress({
  className,
  children,
  value,
  ...props
}: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="progress"
      className={cn("flex flex-wrap gap-3", className)}
      {...props}
    >
      {children}
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  )
}

/**
 * ProgressTrack component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Progress value=60 />
 * ```
 */
function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      className={cn(
        "bg-muted h-1 rounded-full relative flex w-full items-center overflow-x-hidden",
        className
      )}
      data-slot="progress-track"
      {...props}
    />
  )
}

/**
 * ProgressIndicator component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Progress value=60 />
 * ```
 */
function ProgressIndicator({
  className,
  ...props
}: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn("bg-primary h-full transition-all", className)}
      {...props}
    />
  )
}

/**
 * ProgressLabel component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Progress value=60 />
 * ```
 */
function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      className={cn("text-sm font-medium", className)}
      data-slot="progress-label"
      {...props}
    />
  )
}

/**
 * ProgressValue component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Progress value=60 />
 * ```
 */
function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      className={cn("text-muted-foreground ml-auto text-sm tabular-nums", className)}
      data-slot="progress-value"
      {...props}
    />
  )
}
/**
 * Props for Progress.
 *
 * @example
 * ```tsx
 * <Progress value=60 />
 * ```
 */
export type ProgressProps = React.ComponentProps<typeof Progress>

/**
 * Props for ProgressTrack.
 *
 * @example
 * ```tsx
 * <Progress value=60 />
 * ```
 */
export type ProgressTrackProps = React.ComponentProps<typeof ProgressTrack>

/**
 * Props for ProgressIndicator.
 *
 * @example
 * ```tsx
 * <Progress value=60 />
 * ```
 */
export type ProgressIndicatorProps = React.ComponentProps<typeof ProgressIndicator>

/**
 * Props for ProgressLabel.
 *
 * @example
 * ```tsx
 * <Progress value=60 />
 * ```
 */
export type ProgressLabelProps = React.ComponentProps<typeof ProgressLabel>

/**
 * Props for ProgressValue.
 *
 * @example
 * ```tsx
 * <Progress value=60 />
 * ```
 */
export type ProgressValueProps = React.ComponentProps<typeof ProgressValue>


export {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
}