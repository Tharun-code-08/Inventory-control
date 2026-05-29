import * as React from "react";

import { cn } from "@/lib/cn";

type TableProps = React.HTMLAttributes<HTMLTableElement> & {
  stickyHeader?: boolean;
};

const TableContext = React.createContext<{ stickyHeader: boolean }>({ stickyHeader: true });

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, stickyHeader = true, ...props }, ref) => {
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const [scrolled, setScrolled] = React.useState(false);

    React.useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;

      const onScroll = () => setScrolled(el.scrollTop > 2);
      onScroll();
      el.addEventListener("scroll", onScroll, { passive: true });
      return () => el.removeEventListener("scroll", onScroll);
    }, []);

    return (
      <TableContext.Provider value={{ stickyHeader }}>
        <div
          ref={scrollRef}
          data-scrolled={scrolled ? "true" : undefined}
          className={cn(
            "table-scroll relative w-full overflow-auto rounded-xl border border-border bg-card",
            scrolled && "table-sticky-scrolled",
          )}
        >
          <table
            ref={ref}
            className={cn("table-interactive w-full caption-bottom text-sm", className)}
            {...props}
          />
        </div>
      </TableContext.Provider>
    );
  },
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
  const { stickyHeader } = React.useContext(TableContext);
  return (
    <thead
      ref={ref}
      className={cn(
        "[&_tr]:border-b",
        stickyHeader && "sticky top-0 z-10 bg-card shadow-sm",
        className,
      )}
      {...props}
    />
  );
});
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "table-row-interactive border-b border-border transition-[background-color,transform,box-shadow] duration-200 ease-out hover:bg-muted/50 hover:shadow-sm data-[state=selected]:bg-accent",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-11 bg-inherit px-3 text-left align-middle font-semibold text-muted-foreground transition-colors duration-200 hover:bg-muted/40 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-3 align-middle text-foreground transition-colors duration-200 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
