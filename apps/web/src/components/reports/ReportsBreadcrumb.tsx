type ReportsBreadcrumbProps = {
  items: string[];
};

export function ReportsBreadcrumb({ items }: ReportsBreadcrumbProps) {
  return (
    <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
      {items.map((item, index) => (
        <span key={item}>
          {item}
          {index < items.length - 1 ? <span className="mx-2 text-muted-foreground/50">/</span> : null}
        </span>
      ))}
    </div>
  );
}
