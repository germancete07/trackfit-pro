import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({ className, padding = "md", children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl shadow-sm border border-gray-100",
        { none: "", sm: "p-3", md: "p-4", lg: "p-6" }[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
