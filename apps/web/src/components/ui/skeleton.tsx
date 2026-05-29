import { cn } from "@/lib/cn";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("motion-shimmer rounded-md bg-primary/10", className)}
      {...props}
    />
  );
}

export { Skeleton };
