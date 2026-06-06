"use client";

import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Student { id: string; full_name: string }

interface Props {
  students: Student[];
  activeStudent: string;
  activeStatus: string;
}

export function CalendarFilters({ students, activeStudent, activeStatus }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function buildUrl(student: string, status: string) {
    const params = new URLSearchParams();
    if (student) params.set("student", student);
    if (status) params.set("status", status);
    const qs = params.toString();
    return `${pathname}${qs ? "?" + qs : ""}`;
  }

  function setStudent(id: string) {
    router.push(buildUrl(id, activeStatus));
  }

  function setStatus(s: string) {
    router.push(buildUrl(activeStudent, s));
  }

  const statusOptions = [
    { value: "", label: "Todos" },
    { value: "pending", label: "Pendientes" },
    { value: "completed", label: "Completadas" },
  ];

  const hasFilters = activeStudent || activeStatus;

  return (
    <div className="flex flex-col gap-2">
      {/* Student select */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <select
            value={activeStudent}
            onChange={(e) => setStudent(e.target.value)}
            className="h-9 w-full rounded-xl border border-gray-200 bg-white pl-3.5 pr-8 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none"
          >
            <option value="">Todos los alumnos</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={() => router.push(pathname)}
            className="h-9 px-3 rounded-xl bg-gray-100 text-xs font-semibold text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Status chips */}
      <div className="flex gap-1.5">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatus(opt.value)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold transition-all",
              activeStatus === opt.value
                ? "bg-brand-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
