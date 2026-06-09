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
  /** Which routine day to use (1-based, cycles through all days) */
  routineDayNumber: number;
}

/**
 * Compute all session dates for a routine assignment.
 * @param numDays Total number of routine days to cycle through (default 1)
 */
export function buildSessionSlots(
  startDate: string,
  trainingDays: number[],
  totalWeeks: number,
  deloadEveryWeeks: number | null,
  numDays: number = 1
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
        const routineDayNumber = numDays <= 1 ? 1 : ((cycleDay - 1) % numDays) + 1;
        slots.push({ date: toDateStr(sessionDate), isDeload, cycleDay, routineDayNumber });
        cycleDay++;
      }
    }
  }
  return slots;
}

export type RoutineDayInfo = { id: string; day_number: number; name: string };

export function buildSessionRows(
  trainerId: string,
  studentId: string,
  templateName: string,
  assignmentId: string,
  slots: SessionSlot[],
  daysInfo: RoutineDayInfo[] = []
): object[] {
  return slots.map(s => {
    const dayInfo = daysInfo.find(d => d.day_number === s.routineDayNumber);
    return {
      trainer_id: trainerId,
      student_id: studentId,
      name: templateName,
      scheduled_date: s.date,
      status: "pending",
      assignment_id: assignmentId,
      cycle_day: s.cycleDay,
      is_deload: s.isDeload,
      routine_day_id: dayInfo?.id ?? null,
      routine_day_number: s.routineDayNumber,
      routine_day_name: dayInfo?.name ?? null,
    };
  });
}

export type DbExercise = {
  name: string; sets: number; reps: string;
  rest_seconds: number | null; youtube_url: string | null;
  technical_note: string | null; sort_order: number;
  superset_group: string | null;
};

export type RoutineDayWithExercises = {
  day_number: number;
  exercises: DbExercise[];
};

/**
 * Build exercise rows for the newly created sessions.
 * Each session gets only the exercises belonging to its routine day.
 */
export function buildExerciseRows(
  sessions: { id: string; routineDayNumber: number }[],
  dayExercises: RoutineDayWithExercises[]
): object[] {
  return sessions.flatMap(session => {
    const dayEx = dayExercises.find(d => d.day_number === session.routineDayNumber);
    if (!dayEx || dayEx.exercises.length === 0) return [];
    return dayEx.exercises.map(ex => ({
      session_id: session.id,
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      rest_seconds: ex.rest_seconds,
      youtube_url: ex.youtube_url,
      technical_note: ex.technical_note,
      sort_order: ex.sort_order,
      superset_group: ex.superset_group || null,
    }));
  });
}
