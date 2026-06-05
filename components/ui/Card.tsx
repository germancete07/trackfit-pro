import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  glass?: boolean;
}

export function Card({ className, padding = "md", glass = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border transition-all duration-200",
        glass
          ? "bg-white/70 backdrop-blur-xl border-white/50 shadow-lg shadow-black/5"
          : "bg-white border-gray-100 shadow-sm shadow-black/[0.04]",
        { none: "", sm: "p-3", md: "p-4", lg: "p-6" }[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
