import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
  const variants = {
    default: "bg-primary text-white tracking-[0.1em] uppercase hover:bg-primary/90",
    destructive: "bg-destructive text-white tracking-[0.1em] uppercase hover:bg-destructive/90",
    outline: "border border-input hover:bg-accent hover:text-accent-foreground tracking-[0.1em] uppercase",
    secondary: "bg-white border border-brand-navy text-brand-navy tracking-[0.1em] uppercase hover:bg-slate-50",
    ghost: "hover:bg-accent hover:text-accent-foreground tracking-[0.1em] uppercase",
    link: "underline-offset-4 hover:underline text-primary tracking-[0.1em] uppercase",
  };
  const sizes = {
    default: "h-10 py-2 px-4",
    sm: "h-9 px-3 rounded-md",
    lg: "h-11 px-8 rounded-md",
    icon: "h-10 w-10",
  };
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
});
Button.displayName = "Button";
