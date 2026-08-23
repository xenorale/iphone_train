import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('volt.db');

let migrated = false;

/** Idempotent schema setup. Safe to call multiple times. */
export function migrate() {
  if (migrated) return;
  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS programs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      goal TEXT,
      days_per_week INTEGER,
      created_at INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS program_days (
      id TEXT PRIMARY KEY,
      program_id TEXT NOT NULL,
      day_index INTEGER NOT NULL,
      title TEXT NOT NULL,
      focus TEXT
    );

    CREATE TABLE IF NOT EXISTS program_exercises (
      id TEXT PRIMARY KEY,
      day_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      name_ru TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      sets INTEGER NOT NULL,
      rep_min INTEGER,
      rep_max INTEGER,
      target_rpe REAL,
      rest_seconds INTEGER,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS workout_sessions (
      id TEXT PRIMARY KEY,
      program_day_id TEXT,
      title TEXT,
      started_at INTEGER NOT NULL,
      finished_at INTEGER,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS logged_sets (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      name_ru TEXT,
      set_index INTEGER NOT NULL,
      weight REAL,
      reps INTEGER,
      rpe REAL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS body_metrics (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      bodyweight REAL,
      measurements TEXT,
      photo_uri TEXT,
      note TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS technique_cache (
      exercise_id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      model TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS food_log (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      meal TEXT NOT NULL,
      text TEXT NOT NULL,
      kcal REAL,
      protein REAL,
      fat REAL,
      carbs REAL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_food_date ON food_log(date);
    CREATE INDEX IF NOT EXISTS idx_days_program ON program_days(program_id);
    CREATE INDEX IF NOT EXISTS idx_pex_day ON program_exercises(day_id);
    CREATE INDEX IF NOT EXISTS idx_sets_session ON logged_sets(session_id);
    CREATE INDEX IF NOT EXISTS idx_sets_exercise ON logged_sets(exercise_id);
    CREATE INDEX IF NOT EXISTS idx_metrics_date ON body_metrics(date);
  `);

  // additive migrations for existing databases
  const addColumn = (table: string, col: string, type: string) => {
    const cols = db.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`);
    if (!cols.some((c) => c.name === col)) {
      db.execSync(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
    }
  };
  addColumn('programs', 'weeks', 'INTEGER');
  addColumn('programs', 'phase', 'TEXT');
  addColumn('programs', 'phase_reason', 'TEXT');
  addColumn('programs', 'progression_notes', 'TEXT');
  addColumn('programs', 'current_week', 'INTEGER');
  addColumn('programs', 'week_started_at', 'INTEGER');
  addColumn('program_exercises', 'start_weight', 'REAL');
  addColumn('workout_sessions', 'review', 'TEXT');

  migrated = true;
}
