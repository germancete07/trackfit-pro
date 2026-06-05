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
  created_at: string;
}

export interface SessionTemplate {
  id: string;
  trainer_id: string;
  name: string;
  description: string | null;
  created_at: string;
  template_exercises?: TemplateExercise[];
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
  created_at: string;
  // joined
  student?: Profile;
  exercises?: Exercise[];
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
  sort_order: number;
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
  type: "session_logged" | "correction_submitted" | "correction_reviewed";
  message: string;
  reference_id: string | null;
  read: boolean;
  created_at: string;
}

// Weekly load aggregation
export interface WeeklyLoad {
  week_start: string;
  total_volume: number; // sum of weight_kg * completed_sets
  sessions_count: number;
  avg_rpe: number;
}
