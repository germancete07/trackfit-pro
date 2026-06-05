"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  count: number;
}

export function NotificationBell({ count }: NotificationBellProps) {
  return (
    <Link
      href="/dashboard/notifications"
      className={cn(
        "relative h-8 w-8 rounded-full flex items-center justify-center transition-colors",
        count > 0 ? "text-brand-500 bg-brand-50" : "text-gray-400 hover:bg-gray-100"
      )}
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-brand-500 text-white text-[9px] font-bold flex items-center justify-center">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
