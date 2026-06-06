export function PageSkeleton({ lines = 4, title = true }: { lines?: number; title?: boolean }) {
  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      {title && <div className="h-7 w-40 skeleton rounded-xl" />}
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl p-4 flex flex-col gap-3"
          style={{
            background: "var(--card-bg)",
            border: "0.5px solid var(--card-border)",
            animationDelay: `${i * 60}ms`,
          }}
        >
          <div className="skeleton h-4 rounded-lg" style={{ width: `${78 - i * 7}%` }} />
          <div className="skeleton h-4 rounded-lg w-1/2" />
          {i === 0 && <div className="skeleton h-10 rounded-xl mt-1" />}
        </div>
      ))}
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <div className="skeleton h-9 w-9 rounded-full flex-shrink-0" />
        <div className="flex flex-col gap-1.5">
          <div className="skeleton h-4 w-28 rounded-lg" />
          <div className="skeleton h-3 w-16 rounded-lg" />
        </div>
      </div>
      <div className="flex-1 px-4 py-4 flex flex-col gap-3">
        {[70, 50, 80, 45, 60].map((w, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
            <div className="skeleton h-10 rounded-2xl" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="px-4 py-5 flex flex-col gap-3">
      <div className="skeleton h-7 w-32 rounded-xl mb-1" />
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl p-4 flex items-center gap-3"
          style={{
            background: "var(--card-bg)",
            border: "0.5px solid var(--card-border)",
            animationDelay: `${i * 80}ms`,
          }}
        >
          <div className="skeleton h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="skeleton h-4 rounded-lg" style={{ width: `${60 + i * 10}%` }} />
            <div className="skeleton h-3 rounded-lg w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
