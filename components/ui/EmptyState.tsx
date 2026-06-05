"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

type Illustration = "students" | "sessions" | "corrections" | "notifications";

const illustrations: Record<Illustration, React.ReactNode> = {
  students: (
    <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-28 h-24">
      <circle cx="60" cy="32" r="18" fill="#EEF0FF" stroke="#C7CAFF" strokeWidth="2" />
      <circle cx="60" cy="28" r="9" fill="#C7CAFF" />
      <path d="M36 70c0-13.255 10.745-24 24-24h0c13.255 0 24 10.745 24 24" fill="#EEF0FF" stroke="#C7CAFF" strokeWidth="2" strokeLinecap="round" />
      <circle cx="30" cy="38" r="12" fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="1.5" />
      <circle cx="30" cy="35" r="6" fill="#E5E7EB" />
      <path d="M12 66c0-9.941 8.059-18 18-18" stroke="#E5E7EB" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="90" cy="38" r="12" fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="1.5" />
      <circle cx="90" cy="35" r="6" fill="#E5E7EB" />
      <path d="M108 66c0-9.941-8.059-18-18-18" stroke="#E5E7EB" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="85" cy="78" r="10" fill="#534AB7" opacity=".15" />
      <path d="M81 78h8M85 74v8" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  sessions: (
    <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-28 h-24">
      <rect x="20" y="18" width="80" height="64" rx="10" fill="#EEF0FF" stroke="#C7CAFF" strokeWidth="2" />
      <rect x="30" y="34" width="60" height="8" rx="4" fill="#C7CAFF" />
      <rect x="30" y="50" width="40" height="6" rx="3" fill="#E5E7EB" />
      <rect x="30" y="62" width="50" height="6" rx="3" fill="#E5E7EB" />
      <circle cx="88" cy="74" r="14" fill="#534AB7" opacity=".12" />
      <path d="M84 74h8M88 70v8" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" />
      <rect x="40" y="10" width="6" height="16" rx="3" fill="#C7CAFF" />
      <rect x="74" y="10" width="6" height="16" rx="3" fill="#C7CAFF" />
    </svg>
  ),
  corrections: (
    <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-28 h-24">
      <rect x="24" y="22" width="72" height="54" rx="12" fill="#EEF0FF" stroke="#C7CAFF" strokeWidth="2" />
      <path d="M38 46l8 8 16-16" stroke="#534AB7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity=".3" />
      <path d="M72 42h12M72 52h8" stroke="#C7CAFF" strokeWidth="2" strokeLinecap="round" />
      <circle cx="86" cy="78" r="12" fill="#534AB7" opacity=".12" />
      <path d="M82 78h8M86 74v8" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" />
      <path d="M48 28l-6-8" stroke="#C7CAFF" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M72 28l6-8" stroke="#C7CAFF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  notifications: (
    <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-28 h-24">
      <path d="M60 18c-16.569 0-28 11.431-28 28v16l-6 8h68l-6-8V46c0-16.569-11.431-28-28-28z" fill="#EEF0FF" stroke="#C7CAFF" strokeWidth="2" />
      <path d="M52 70a8 8 0 0016 0" fill="#C7CAFF" stroke="#C7CAFF" strokeWidth="1.5" />
      <path d="M60 18v-6" stroke="#C7CAFF" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 50h40M40 58h28" stroke="#E5E7EB" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

interface Props {
  illustration: Illustration;
  title: string;
  description?: string;
  action?: { label: string; onClick?: () => void; href?: string };
}

export function EmptyState({ illustration, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-4">
      <div className="opacity-80">{illustrations[illustration]}</div>
      <div>
        <p className="text-base font-bold text-gray-700">{title}</p>
        {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
      </div>
      {action && (
        action.href ? (
          <Link href={action.href}>
            <Button size="sm">{action.label}</Button>
          </Link>
        ) : (
          <Button size="sm" onClick={action.onClick}>{action.label}</Button>
        )
      )}
    </div>
  );
}
