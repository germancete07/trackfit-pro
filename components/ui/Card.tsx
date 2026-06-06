import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  glass?: boolean;
}

export function Card({ className, padding = "md", glass, style, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl transition-all duration-200",
        { none: "", sm: "p-3", md: "p-4", lg: "p-6" }[padding],
        className
      )}
      style={{
        background: "var(--card-bg)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "0.5px solid var(--card-border)",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
