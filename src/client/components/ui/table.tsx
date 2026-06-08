import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Table component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Table>
 *       <TableHeader>
 *         <TableRow>
 *           <TableHead>Name</TableHead>
 *           <TableHead>Status</TableHead>
 *           <TableHead className="text-right">Due</TableHead>
 *         </TableRow>
 *       </TableHeader>
 *       <TableBody>
 *         <TableRow>
 *           <TableCell>Website refresh</TableCell>
 *           <TableCell>In progress</TableCell>
 *           <TableCell className="text-right">Tomorrow</TableCell>
 *         </TableRow>
 *         <TableRow>
 *           <TableCell>Design review</TableCell>
 *           <TableCell>Blocked</TableCell>
 *           <TableCell className="text-right">Friday</TableCell>
 *         </TableRow>
 *       </TableBody>
 *     </Table>
 * ```
 */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

/**
 * TableHeader component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Table>
 *       <TableHeader>
 *         <TableRow>
 *           <TableHead>Name</TableHead>
 *           <TableHead>Status</TableHead>
 *           <TableHead className="text-right">Due</TableHead>
 *         </TableRow>
 *       </TableHeader>
 *       <TableBody>
 *         <TableRow>
 *           <TableCell>Website refresh</TableCell>
 *           <TableCell>In progress</TableCell>
 *           <TableCell className="text-right">Tomorrow</TableCell>
 *         </TableRow>
 *         <TableRow>
 *           <TableCell>Design review</TableCell>
 *           <TableCell>Blocked</TableCell>
 *           <TableCell className="text-right">Friday</TableCell>
 *         </TableRow>
 *       </TableBody>
 *     </Table>
 * ```
 */
function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

/**
 * TableBody component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Table>
 *       <TableHeader>
 *         <TableRow>
 *           <TableHead>Name</TableHead>
 *           <TableHead>Status</TableHead>
 *           <TableHead className="text-right">Due</TableHead>
 *         </TableRow>
 *       </TableHeader>
 *       <TableBody>
 *         <TableRow>
 *           <TableCell>Website refresh</TableCell>
 *           <TableCell>In progress</TableCell>
 *           <TableCell className="text-right">Tomorrow</TableCell>
 *         </TableRow>
 *         <TableRow>
 *           <TableCell>Design review</TableCell>
 *           <TableCell>Blocked</TableCell>
 *           <TableCell className="text-right">Friday</TableCell>
 *         </TableRow>
 *       </TableBody>
 *     </Table>
 * ```
 */
function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

/**
 * TableFooter component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Table>
 *       <TableHeader>
 *         <TableRow>
 *           <TableHead>Name</TableHead>
 *           <TableHead>Status</TableHead>
 *           <TableHead className="text-right">Due</TableHead>
 *         </TableRow>
 *       </TableHeader>
 *       <TableBody>
 *         <TableRow>
 *           <TableCell>Website refresh</TableCell>
 *           <TableCell>In progress</TableCell>
 *           <TableCell className="text-right">Tomorrow</TableCell>
 *         </TableRow>
 *         <TableRow>
 *           <TableCell>Design review</TableCell>
 *           <TableCell>Blocked</TableCell>
 *           <TableCell className="text-right">Friday</TableCell>
 *         </TableRow>
 *       </TableBody>
 *     </Table>
 * ```
 */
function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("bg-muted/50 border-t font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  )
}

/**
 * TableRow component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Table>
 *       <TableHeader>
 *         <TableRow>
 *           <TableHead>Name</TableHead>
 *           <TableHead>Status</TableHead>
 *           <TableHead className="text-right">Due</TableHead>
 *         </TableRow>
 *       </TableHeader>
 *       <TableBody>
 *         <TableRow>
 *           <TableCell>Website refresh</TableCell>
 *           <TableCell>In progress</TableCell>
 *           <TableCell className="text-right">Tomorrow</TableCell>
 *         </TableRow>
 *         <TableRow>
 *           <TableCell>Design review</TableCell>
 *           <TableCell>Blocked</TableCell>
 *           <TableCell className="text-right">Friday</TableCell>
 *         </TableRow>
 *       </TableBody>
 *     </Table>
 * ```
 */
function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn("hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors", className)}
      {...props}
    />
  )
}

/**
 * TableHead component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Table>
 *       <TableHeader>
 *         <TableRow>
 *           <TableHead>Name</TableHead>
 *           <TableHead>Status</TableHead>
 *           <TableHead className="text-right">Due</TableHead>
 *         </TableRow>
 *       </TableHeader>
 *       <TableBody>
 *         <TableRow>
 *           <TableCell>Website refresh</TableCell>
 *           <TableCell>In progress</TableCell>
 *           <TableCell className="text-right">Tomorrow</TableCell>
 *         </TableRow>
 *         <TableRow>
 *           <TableCell>Design review</TableCell>
 *           <TableCell>Blocked</TableCell>
 *           <TableCell className="text-right">Friday</TableCell>
 *         </TableRow>
 *       </TableBody>
 *     </Table>
 * ```
 */
function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn("text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0", className)}
      {...props}
    />
  )
}

/**
 * TableCell component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Table>
 *       <TableHeader>
 *         <TableRow>
 *           <TableHead>Name</TableHead>
 *           <TableHead>Status</TableHead>
 *           <TableHead className="text-right">Due</TableHead>
 *         </TableRow>
 *       </TableHeader>
 *       <TableBody>
 *         <TableRow>
 *           <TableCell>Website refresh</TableCell>
 *           <TableCell>In progress</TableCell>
 *           <TableCell className="text-right">Tomorrow</TableCell>
 *         </TableRow>
 *         <TableRow>
 *           <TableCell>Design review</TableCell>
 *           <TableCell>Blocked</TableCell>
 *           <TableCell className="text-right">Friday</TableCell>
 *         </TableRow>
 *       </TableBody>
 *     </Table>
 * ```
 */
function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0", className)}
      {...props}
    />
  )
}

/**
 * TableCaption component styled for this UI kit.
 *
 * @example
 * ```tsx
 * <Table>
 *       <TableHeader>
 *         <TableRow>
 *           <TableHead>Name</TableHead>
 *           <TableHead>Status</TableHead>
 *           <TableHead className="text-right">Due</TableHead>
 *         </TableRow>
 *       </TableHeader>
 *       <TableBody>
 *         <TableRow>
 *           <TableCell>Website refresh</TableCell>
 *           <TableCell>In progress</TableCell>
 *           <TableCell className="text-right">Tomorrow</TableCell>
 *         </TableRow>
 *         <TableRow>
 *           <TableCell>Design review</TableCell>
 *           <TableCell>Blocked</TableCell>
 *           <TableCell className="text-right">Friday</TableCell>
 *         </TableRow>
 *       </TableBody>
 *     </Table>
 * ```
 */
function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  )
}
/**
 * Props for Table.
 *
 * @example
 * ```tsx
 * <Table>
 *       <TableHeader>
 *         <TableRow>
 *           <TableHead>Name</TableHead>
 *           <TableHead>Status</TableHead>
 *           <TableHead className="text-right">Due</TableHead>
 *         </TableRow>
 *       </TableHeader>
 *       <TableBody>
 *         <TableRow>
 *           <TableCell>Website refresh</TableCell>
 *           <TableCell>In progress</TableCell>
 *           <TableCell className="text-right">Tomorrow</TableCell>
 *         </TableRow>
 *         <TableRow>
 *           <TableCell>Design review</TableCell>
 *           <TableCell>Blocked</TableCell>
 *           <TableCell className="text-right">Friday</TableCell>
 *         </TableRow>
 *       </TableBody>
 *     </Table>
 * ```
 */
export type TableProps = React.ComponentProps<typeof Table>

/**
 * Props for TableHeader.
 *
 * @example
 * ```tsx
 * <Table>
 *       <TableHeader>
 *         <TableRow>
 *           <TableHead>Name</TableHead>
 *           <TableHead>Status</TableHead>
 *           <TableHead className="text-right">Due</TableHead>
 *         </TableRow>
 *       </TableHeader>
 *       <TableBody>
 *         <TableRow>
 *           <TableCell>Website refresh</TableCell>
 *           <TableCell>In progress</TableCell>
 *           <TableCell className="text-right">Tomorrow</TableCell>
 *         </TableRow>
 *         <TableRow>
 *           <TableCell>Design review</TableCell>
 *           <TableCell>Blocked</TableCell>
 *           <TableCell className="text-right">Friday</TableCell>
 *         </TableRow>
 *       </TableBody>
 *     </Table>
 * ```
 */
export type TableHeaderProps = React.ComponentProps<typeof TableHeader>

/**
 * Props for TableBody.
 *
 * @example
 * ```tsx
 * <Table>
 *       <TableHeader>
 *         <TableRow>
 *           <TableHead>Name</TableHead>
 *           <TableHead>Status</TableHead>
 *           <TableHead className="text-right">Due</TableHead>
 *         </TableRow>
 *       </TableHeader>
 *       <TableBody>
 *         <TableRow>
 *           <TableCell>Website refresh</TableCell>
 *           <TableCell>In progress</TableCell>
 *           <TableCell className="text-right">Tomorrow</TableCell>
 *         </TableRow>
 *         <TableRow>
 *           <TableCell>Design review</TableCell>
 *           <TableCell>Blocked</TableCell>
 *           <TableCell className="text-right">Friday</TableCell>
 *         </TableRow>
 *       </TableBody>
 *     </Table>
 * ```
 */
export type TableBodyProps = React.ComponentProps<typeof TableBody>

/**
 * Props for TableFooter.
 *
 * @example
 * ```tsx
 * <Table>
 *       <TableHeader>
 *         <TableRow>
 *           <TableHead>Name</TableHead>
 *           <TableHead>Status</TableHead>
 *           <TableHead className="text-right">Due</TableHead>
 *         </TableRow>
 *       </TableHeader>
 *       <TableBody>
 *         <TableRow>
 *           <TableCell>Website refresh</TableCell>
 *           <TableCell>In progress</TableCell>
 *           <TableCell className="text-right">Tomorrow</TableCell>
 *         </TableRow>
 *         <TableRow>
 *           <TableCell>Design review</TableCell>
 *           <TableCell>Blocked</TableCell>
 *           <TableCell className="text-right">Friday</TableCell>
 *         </TableRow>
 *       </TableBody>
 *     </Table>
 * ```
 */
export type TableFooterProps = React.ComponentProps<typeof TableFooter>

/**
 * Props for TableRow.
 *
 * @example
 * ```tsx
 * <Table>
 *       <TableHeader>
 *         <TableRow>
 *           <TableHead>Name</TableHead>
 *           <TableHead>Status</TableHead>
 *           <TableHead className="text-right">Due</TableHead>
 *         </TableRow>
 *       </TableHeader>
 *       <TableBody>
 *         <TableRow>
 *           <TableCell>Website refresh</TableCell>
 *           <TableCell>In progress</TableCell>
 *           <TableCell className="text-right">Tomorrow</TableCell>
 *         </TableRow>
 *         <TableRow>
 *           <TableCell>Design review</TableCell>
 *           <TableCell>Blocked</TableCell>
 *           <TableCell className="text-right">Friday</TableCell>
 *         </TableRow>
 *       </TableBody>
 *     </Table>
 * ```
 */
export type TableRowProps = React.ComponentProps<typeof TableRow>

/**
 * Props for TableHead.
 *
 * @example
 * ```tsx
 * <Table>
 *       <TableHeader>
 *         <TableRow>
 *           <TableHead>Name</TableHead>
 *           <TableHead>Status</TableHead>
 *           <TableHead className="text-right">Due</TableHead>
 *         </TableRow>
 *       </TableHeader>
 *       <TableBody>
 *         <TableRow>
 *           <TableCell>Website refresh</TableCell>
 *           <TableCell>In progress</TableCell>
 *           <TableCell className="text-right">Tomorrow</TableCell>
 *         </TableRow>
 *         <TableRow>
 *           <TableCell>Design review</TableCell>
 *           <TableCell>Blocked</TableCell>
 *           <TableCell className="text-right">Friday</TableCell>
 *         </TableRow>
 *       </TableBody>
 *     </Table>
 * ```
 */
export type TableHeadProps = React.ComponentProps<typeof TableHead>

/**
 * Props for TableCell.
 *
 * @example
 * ```tsx
 * <Table>
 *       <TableHeader>
 *         <TableRow>
 *           <TableHead>Name</TableHead>
 *           <TableHead>Status</TableHead>
 *           <TableHead className="text-right">Due</TableHead>
 *         </TableRow>
 *       </TableHeader>
 *       <TableBody>
 *         <TableRow>
 *           <TableCell>Website refresh</TableCell>
 *           <TableCell>In progress</TableCell>
 *           <TableCell className="text-right">Tomorrow</TableCell>
 *         </TableRow>
 *         <TableRow>
 *           <TableCell>Design review</TableCell>
 *           <TableCell>Blocked</TableCell>
 *           <TableCell className="text-right">Friday</TableCell>
 *         </TableRow>
 *       </TableBody>
 *     </Table>
 * ```
 */
export type TableCellProps = React.ComponentProps<typeof TableCell>

/**
 * Props for TableCaption.
 *
 * @example
 * ```tsx
 * <Table>
 *       <TableHeader>
 *         <TableRow>
 *           <TableHead>Name</TableHead>
 *           <TableHead>Status</TableHead>
 *           <TableHead className="text-right">Due</TableHead>
 *         </TableRow>
 *       </TableHeader>
 *       <TableBody>
 *         <TableRow>
 *           <TableCell>Website refresh</TableCell>
 *           <TableCell>In progress</TableCell>
 *           <TableCell className="text-right">Tomorrow</TableCell>
 *         </TableRow>
 *         <TableRow>
 *           <TableCell>Design review</TableCell>
 *           <TableCell>Blocked</TableCell>
 *           <TableCell className="text-right">Friday</TableCell>
 *         </TableRow>
 *       </TableBody>
 *     </Table>
 * ```
 */
export type TableCaptionProps = React.ComponentProps<typeof TableCaption>


export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
