import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-slate-900 text-primary-foreground shadow-sm hover:bg-slate-800",
        destructive:
          "border border-rose-300/70 bg-rose-50/80 text-rose-800 shadow-sm hover:bg-rose-100/90 hover:text-rose-900",
        outline:
          "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
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
  ({ className, variant, size, asChild = false, children, title, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const ariaLabel =
      typeof props["aria-label"] === "string" ? props["aria-label"] : undefined;
    const inferredTitle = textFromNode(children);
    const resolvedTitle = title ?? ariaLabel ?? (inferredTitle || undefined);
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
);
Button.displayName = "Button";

export { Button, buttonVariants };
