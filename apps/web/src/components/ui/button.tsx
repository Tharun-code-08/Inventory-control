import * as React from "react";
import { Loader2 } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_1px_2px_rgb(15_23_42_/_0.08)] hover:bg-primary-hover hover:shadow-[0_2px_4px_rgb(15_23_42_/_0.12)]",
        destructive:
          "border border-rose-300/70 bg-rose-50 text-rose-800 shadow-[0_1px_2px_rgb(15_23_42_/_0.04)] hover:bg-rose-100 hover:text-rose-900 dark:border-rose-500/40 dark:bg-rose-950/50 dark:text-rose-200 dark:hover:bg-rose-950/70",
        outline:
          "border border-input bg-background text-foreground shadow-[0_1px_2px_rgb(15_23_42_/_0.04)] hover:bg-accent hover:text-accent-foreground hover:border-input/80",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0_1px_2px_rgb(15_23_42_/_0.04)] hover:bg-secondary/80",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingLabel?: string;
}

function textFromNode(node: React.ReactNode): string {
  if (typeof node === "string") return node.trim();
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) {
    for (const item of node) {
      const text = textFromNode(item);
      if (text) return text;
    }
    return "";
  }
  if (React.isValidElement(node)) {
    return textFromNode(node.props.children);
  }
  return "";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      children,
      title,
      loading = false,
      loadingLabel,
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const ariaLabel =
      typeof props["aria-label"] === "string" ? props["aria-label"] : undefined;
    const inferredTitle = textFromNode(children);
    const resolvedTitle = title ?? ariaLabel ?? (inferredTitle || undefined);

    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          title={resolvedTitle}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    const showLabel = loading && loadingLabel ? loadingLabel : children;

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        title={resolvedTitle}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {showLabel}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
