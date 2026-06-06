export function PageSkeleton({ lines = 4, title = true }: { lines?: number; title?: boolean }) {
  return (
    <div className="px-4 py-5 flex flex-col gap-4 animate-pulse">
      {title && <div className="h-7 w-40 bg-gray-200 rounded-xl" />}
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="bg-gray-100 rounded-2xl p-4 flex flex-col gap-3">
          <div className="h-4 bg-gray-200 rounded-lg" style={{ width: `${78 - i * 7}%` }} />
          <div className="h-4 bg-gray-200 rounded-lg w-1/2" />
          {i === 0 && <div className="h-10 bg-gray-200 rounded-xl mt-1" />}
        </div>
      ))}
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 animate-pulse">
        <div className="h-9 w-9 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="flex flex-col gap-1.5">
          <div className="h-4 w-28 bg-gray-200 rounded-lg" />
          <div className="h-3 w-16 bg-gray-100 rounded-lg" />
        </div>
      </div>
      <div className="flex-1 px-4 py-4 flex flex-col gap-3 animate-pulse">
        {[70, 50, 80, 45, 60].map((w, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
            <div className="h-10 rounded-2xl bg-gray-200" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
