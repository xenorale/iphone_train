// Shared domain types.

export type Exercise = {
  id: string;
  name: string;
  nameRu: string;
  muscle: string;
  muscleRu: string;
  secondaryRu: string[];
  equipment: string;
  equipmentRu: string;
  level: string;
  levelRu: string;
  mechanic: string | null;
  category: string;
  cues: string[];
  instructionsEn: string[];
  images: string[];
};

export type Units = 'kg' | 'lb';

export type Goal = 'strength' | 'muscle' | 'fatloss' | 'general';
export type Experience = 'beginner' | 'intermediate' | 'advanced';
export type Sex = 'male' | 'female' | 'unknown';
export type Phase = 'cut' | 'bulk' | 'recomp' | 'maintain';

/** Working weights (kg) по основным группам, ~6–8 повторов; undefined = «не знаю». */
export type StrengthAnchors = {
  chest?: number;
  legs?: number;
  back?: number;
  biceps?: number;
  triceps?: number;
};

export type Profile = {
  goal: Goal;
  experience: Experience;
  daysPerWeek: number;
  equipment: string[]; // equipment keys available
  sessionMinutes: number;
  sex: Sex;
  bodyweight?: number;
  height?: number;
  strength: StrengthAnchors;
};

// ---- DB row types ----

export type ProgramRow = {
  id: string;
  name: string;
  goal: string | null;
  days_per_week: number | null;
  created_at: number;
  is_active: number;
  notes: string | null;
  weeks: number | null;
  phase: string | null;
  phase_reason: string | null;
  progression_notes: string | null;
  current_week: number | null;
  week_started_at: number | null;
};

export type ProgramDayRow = {
  id: string;
  program_id: string;
  day_index: number;
  title: string;
  focus: string | null;
};

export type ProgramExerciseRow = {
  id: string;
  day_id: string;
  exercise_id: string;
  name_ru: string;
  order_index: number;
  sets: number;
  rep_min: number | null;
  rep_max: number | null;
  target_rpe: number | null;
  rest_seconds: number | null;
  notes: string | null;
  start_weight: number | null;
};

export type SessionRow = {
  id: string;
  program_day_id: string | null;
  title: string | null;
  started_at: number;
  finished_at: number | null;
  notes: string | null;
};

export type LoggedSetRow = {
  id: string;
  session_id: string;
  exercise_id: string;
  name_ru: string | null;
  set_index: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  completed: number;
  created_at: number;
};

export type BodyMetricRow = {
  id: string;
  date: string;
  bodyweight: number | null;
  measurements: string | null;
  photo_uri: string | null;
  note: string | null;
  created_at: number;
};
