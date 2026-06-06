"use client";

import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes, forwardRef } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[#2C2C2A]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-xl px-3.5 py-3 text-sm text-[#2C2C2A] placeholder:text-gray-400 transition-colors resize-none",
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
Textarea.displayName = "Textarea";

export { Textarea };
