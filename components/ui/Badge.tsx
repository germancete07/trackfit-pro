import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
}

export function Badge({ variant = "default", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          default: "bg-gray-100 text-gray-700",
          success: "bg-green-100 text-green-700",
          warning: "bg-yellow-100 text-yellow-700",
          danger: "bg-red-100 text-red-700",
          info: "bg-brand-50 text-brand-600",
        }[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
