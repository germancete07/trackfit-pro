/**
 * Shared pure helpers for generating routine assignment sessions.
 * No Supabase imports — safe to use from any server action.
 */

function getMondayUTC(dateStr: string): Date {
  const d = new Date(dateStr + "T12:00:00Z");
  const dow = d.getUTCDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

export function toDateStr(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export interface SessionSlot {
  date: string;
  isDeload: boolean;
  cycleDay: number;
}

/** Compute all session dates for a routine assignment */
export function buildSessionSlots(
  startDate: string,
  trainingDays: number[],
  totalWeeks: number,
  deloadEveryWeeks: number | null
): SessionSlot[] {
  const startTs = new Date(startDate + "T12:00:00Z");
  const monday = getMondayUTC(startDate);
  const sortedDays = [...trainingDays].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
  const slots: SessionSlot[] = [];
  let cycleDay = 1;

  for (let w = 0; w < totalWeeks; w++) {
    const isDeload = deloadEveryWeeks ? (w + 1) % deloadEveryWeeks === 0 : false;
    for (const dow of sortedDays) {
      const offset = dow === 0 ? 6 : dow - 1;
      const sessionDate = new Date(monday);
      sessionDate.setUTCDate(monday.getUTCDate() + w * 7 + offset);
      if (sessionDate >= startTs) {
        slots.push({ date: toDateStr(sessionDate), isDeload, cycleDay });
        cycleDay++;
      }
    }
  }
  return slots;
}

export function buildSessionRows(
  trainerId: string,
  studentId: string,
  templateName: string,
  assignmentId: string,
  slots: SessionSlot[]
): object[] {
  return slots.map(s => ({
    trainer_id: trainerId,
    student_id: studentId,
    name: templateName,
    scheduled_date: s.date,
    status: "pending",
    assignment_id: assignmentId,
    cycle_day: s.cycleDay,
    is_deload: s.isDeload,
  }));
}

export type DbExercise = {
  name: string; sets: number; reps: string;
  rest_seconds: number | null; youtube_url: string | null;
  technical_note: string | null; sort_order: number;
  superset_group: string | null;
};

export function buildExerciseRows(
  sessionIds: string[],
  exercises: DbExercise[]
): object[] {
  return sessionIds.flatMap(sid =>
    exercises.map(ex => ({
      session_id: sid,
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      rest_seconds: ex.rest_seconds,
      youtube_url: ex.youtube_url,
      technical_note: ex.technical_note,
      sort_order: ex.sort_order,
      superset_group: ex.superset_group || null,
    }))
  );
}
