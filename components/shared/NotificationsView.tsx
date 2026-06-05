import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import type { Notification } from "@/lib/types";

const ICONS: Record<Notification["type"], string> = {
  session_logged: "💪",
  correction_submitted: "🎥",
  correction_reviewed: "✅",
};

export function NotificationsView({ notifications }: { notifications: Notification[] }) {
  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <h1 className="text-xl font-black text-gray-900">Notificaciones</h1>

      {notifications.length > 0 ? (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              padding="sm"
              className={`flex items-start gap-3 ${!n.read ? "border-brand-200 bg-brand-50/30" : ""}`}
            >
              <span className="text-xl flex-shrink-0">{ICONS[n.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">{n.message}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(n.created_at)}</p>
              </div>
              {!n.read && (
                <div className="h-2 w-2 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />
              )}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          illustration="notifications"
          title="Sin notificaciones"
          description="Cuando tus alumnos entrenen o suban videos, te avisamos acá."
        />
      )}
    </div>
  );
}
