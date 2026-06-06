"use client";

import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-semibold text-[#2C2C2A]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-11 w-full rounded-xl px-3.5 text-sm text-[#2C2C2A] placeholder:text-gray-400 transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500",
            error && "border-red-400 focus:ring-red-400/50",
            className
          )}
          style={{
            background: "rgba(255,255,255,0.90)",
            border: "1px solid rgba(0,0,0,0.10)",
          }}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
