export type Role = "trainer" | "student";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  trainer_id: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  training_goal: string | null;
  physical_limitations: string | null;
  start_date: string | null;
  trainer_notes: string | null;
  archived: boolean;
  reminder_hour: number | null;
  space_name: string | null;
  preferred_training_days: number[];
  created_at: string;
}

export interface RoutineCategory {
  id: string;
  trainer_id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface SessionTemplate {
  id: string;
  trainer_id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  created_at: string;
  template_exercises?: TemplateExercise[];
  routine_categories?: RoutineCategory | null;
}

export interface TemplateExercise {
  id: string;
  template_id: string;
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number | null;
  youtube_url: string | null;
  technical_note: string | null;
  sort_order: number;
  superset_group: string | null;
}

export interface Message {
  id: string;
  trainer_id: string;
  student_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface TrainingDay {
  id: string;
  student_id: string;
  trainer_id: string;
  day_of_week: number;
  created_at: string;
}

export interface Session {
  id: string;
  trainer_id: string;
  student_id: string;
  name: string;
  scheduled_date: string | null;
  notes: string | null;
  status: "pending" | "active" | "completed";
  assignment_id: string | null;
  cycle_day: number | null;
  is_deload: boolean;
  created_at: string;
  // joined
  student?: Profile;
  exercises?: Exercise[];
}

export interface RoutineAssignment {
  id: string;
  trainer_id: string;
  student_id: string;
  template_id: string;
  start_date: string;
  training_days: number[];
  total_weeks: number;
  deload_every_weeks: number | null;
  status: "active" | "completed" | "cancelled";
  created_at: string;
  // joined
  session_templates?: { name: string } | null;
}

export interface Exercise {
  id: string;
  session_id: string;
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number | null;
  youtube_url: string | null;
  technical_note: string | null;
  muscle_group: string | null;
  sort_order: number;
  superset_group: string | null;
  created_at: string;
  // joined
  logs?: ExerciseLog[];
}

export interface ExerciseLog {
  id: string;
  exercise_id: string;
  student_id: string;
  session_id: string;
  weight_kg: number | null;
  completed_sets: number | null;
  rpe: number | null;
  comment: string | null;
  logged_at: string;
}

export interface VideoCorrection {
  id: string;
  student_id: string;
  trainer_id: string;
  exercise_name: string;
  video_url: string;
  student_comment: string | null;
  trainer_response: string | null;
  status: "pending" | "reviewed";
  created_at: string;
  reviewed_at: string | null;
  // joined
  student?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: "session_logged" | "correction_submitted" | "correction_reviewed" | "assignment_completed" | "session_rescheduled" | "message_received" | "routine_assigned";
  message: string;
  reference_id: string | null;
  read: boolean;
  created_at: string;
}

export interface ExerciseLibraryItem {
  id: string;
  trainer_id: string;
  name: string;
  muscle_group: string;
  description: string | null;
  youtube_url: string | null;
  image_url: string | null;
  created_at: string;
}

export interface BodyMeasurement {
  id: string;
  student_id: string;
  trainer_id: string;
  measured_at: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  created_at: string;
}

export interface ProgressPhoto {
  id: string;
  student_id: string;
  trainer_id: string;
  photo_url: string;
  photo_type: "front" | "side" | "back";
  taken_at: string;
  created_at: string;
}

// Weekly load aggregation
export interface WeeklyLoad {
  week_start: string;
  total_volume: number; // sum of weight_kg * completed_sets
  sessions_count: number;
  avg_rpe: number;
}
