import type { LoggedSetRow, SessionRow } from '@/lib/types';
import { uid } from '@/lib/uid';
import { db } from './index';

export function startSession(programDayId: string | null, title: string): string {
  const id = uid('ses_');
  db.runSync(
    'INSERT INTO workout_sessions (id, program_day_id, title, started_at) VALUES (?, ?, ?, ?)',
    [id, programDayId, title, Date.now()],
  );
  return id;
}

export function upsertSet(params: {
  id?: string;
  sessionId: string;
  exerciseId: string;
  nameRu: string;
  setIndex: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  completed: boolean;
}): string {
  const id = params.id ?? uid('set_');
  db.runSync(
    `INSERT INTO logged_sets (id, session_id, exercise_id, name_ru, set_index, weight, reps, rpe, completed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET weight=excluded.weight, reps=excluded.reps, rpe=excluded.rpe, completed=excluded.completed`,
    [
      id,
      params.sessionId,
      params.exerciseId,
      params.nameRu,
      params.setIndex,
      params.weight,
      params.reps,
      params.rpe,
      params.completed ? 1 : 0,
      Date.now(),
    ],
  );
  return id;
}

export function finishSession(sessionId: string) {
  // drop a session that has no completed sets to avoid clutter
  const done = db.getFirstSync<{ n: number }>(
    'SELECT COUNT(*) as n FROM logged_sets WHERE session_id = ? AND completed = 1',
    [sessionId],
  );
  if (!done || done.n === 0) {
    db.runSync('DELETE FROM logged_sets WHERE session_id = ?', [sessionId]);
    db.runSync('DELETE FROM workout_sessions WHERE id = ?', [sessionId]);
    return;
  }
  db.runSync('UPDATE workout_sessions SET finished_at = ? WHERE id = ?', [Date.now(), sessionId]);
}

export function sessionCount(): number {
  const r = db.getFirstSync<{ n: number }>(
    'SELECT COUNT(*) as n FROM workout_sessions WHERE finished_at IS NOT NULL',
  );
  return r?.n ?? 0;
}

/** Completed workouts since a timestamp — used to track mesocycle week from real training. */
export function sessionCountSince(ts: number): number {
  const r = db.getFirstSync<{ n: number }>(
    'SELECT COUNT(*) as n FROM workout_sessions WHERE finished_at IS NOT NULL AND started_at >= ?',
    [ts],
  );
  return r?.n ?? 0;
}

export function recentSessions(limit = 20): SessionRow[] {
  return db.getAllSync<SessionRow>(
    'SELECT * FROM workout_sessions WHERE finished_at IS NOT NULL ORDER BY started_at DESC LIMIT ?',
    [limit],
  );
}

/** Completed working sets from the most recent session that trained this exercise. */
export function lastWorkingSets(exerciseId: string): LoggedSetRow[] {
  const last = db.getFirstSync<{ sid: string }>(
    `SELECT ls.session_id as sid
       FROM logged_sets ls
       JOIN workout_sessions ws ON ws.id = ls.session_id
      WHERE ls.exercise_id = ? AND ls.completed = 1
      ORDER BY ws.started_at DESC LIMIT 1`,
    [exerciseId],
  );
  if (!last) return [];
  return db.getAllSync<LoggedSetRow>(
    'SELECT * FROM logged_sets WHERE session_id = ? AND exercise_id = ? AND completed = 1 ORDER BY set_index',
    [last.sid, exerciseId],
  );
}

/** Whole days since the last completed session that trained this exercise. */
export function daysSinceLast(exerciseId: string): number | null {
  const r = db.getFirstSync<{ t: number | null }>(
    `SELECT MAX(ws.started_at) as t
       FROM logged_sets ls
       JOIN workout_sessions ws ON ws.id = ls.session_id
      WHERE ls.exercise_id = ? AND ls.completed = 1`,
    [exerciseId],
  );
  if (!r || !r.t) return null;
  return Math.floor((Date.now() - r.t) / 86_400_000);
}

export type HistoryPoint = { t: number; est1rm: number; topWeight: number };

/** Per-session best set (estimated 1RM) for charting strength over time. */
export function exerciseHistory(exerciseId: string): HistoryPoint[] {
  const rows = db.getAllSync<{ t: number; weight: number; reps: number }>(
    `SELECT ws.started_at as t, ls.weight as weight, ls.reps as reps
       FROM logged_sets ls
       JOIN workout_sessions ws ON ws.id = ls.session_id
      WHERE ls.exercise_id = ? AND ls.completed = 1 AND ls.weight IS NOT NULL AND ls.reps IS NOT NULL
      ORDER BY ws.started_at ASC`,
    [exerciseId],
  );
  const bySession = new Map<number, HistoryPoint>();
  for (const r of rows) {
    const est = r.weight * (1 + r.reps / 30);
    const cur = bySession.get(r.t);
    if (!cur || est > cur.est1rm) {
      bySession.set(r.t, { t: r.t, est1rm: Math.round(est * 10) / 10, topWeight: r.weight });
    }
  }
  return [...bySession.values()].sort((a, b) => a.t - b.t);
}

export type SetLine = { weight: number | null; reps: number | null };
export type ExerciseDayLog = { startedAt: number; sets: SetLine[] };

/**
 * Completed sets for one exercise, grouped by the session that logged them.
 * Feeds the "what did I do last time" list under each exercise in a workout.
 */
export function exerciseDayLogs(exerciseId: string, limit = 8): ExerciseDayLog[] {
  const rows = db.getAllSync<{ t: number; weight: number | null; reps: number | null }>(
    `SELECT ws.started_at as t, ls.weight as weight, ls.reps as reps
       FROM logged_sets ls
       JOIN workout_sessions ws ON ws.id = ls.session_id
      WHERE ls.exercise_id = ? AND ls.completed = 1
      ORDER BY ws.started_at DESC, ls.set_index ASC`,
    [exerciseId],
  );

  const byDay = new Map<number, SetLine[]>();
  for (const r of rows) {
    const arr = byDay.get(r.t);
    if (arr) arr.push({ weight: r.weight, reps: r.reps });
    else byDay.set(r.t, [{ weight: r.weight, reps: r.reps }]);
  }
  return [...byDay.entries()]
    .slice(0, limit)
    .map(([startedAt, sets]) => ({ startedAt, sets }));
}

export type SessionExercise = { exerciseId: string; nameRu: string; sets: SetLine[] };
export type SessionDetail = {
  id: string;
  title: string | null;
  programDayId: string | null;
  startedAt: number;
  finishedAt: number | null;
  exercises: SessionExercise[];
  /** Total kg moved — weight × reps across every completed set. */
  volume: number;
};

/** Everything one finished session logged, shaped for the post-workout review. */
export function sessionDetail(sessionId: string): SessionDetail | null {
  const s = db.getFirstSync<SessionRow>('SELECT * FROM workout_sessions WHERE id = ?', [sessionId]);
  if (!s) return null;

  const rows = db.getAllSync<{
    exercise_id: string;
    name_ru: string | null;
    weight: number | null;
    reps: number | null;
  }>(
    `SELECT exercise_id, name_ru, weight, reps
       FROM logged_sets
      WHERE session_id = ? AND completed = 1
      ORDER BY created_at ASC, set_index ASC`,
    [sessionId],
  );

  const byExercise = new Map<string, SessionExercise>();
  let volume = 0;
  for (const r of rows) {
    volume += (r.weight ?? 0) * (r.reps ?? 0);
    const cur = byExercise.get(r.exercise_id);
    const line = { weight: r.weight, reps: r.reps };
    if (cur) cur.sets.push(line);
    else byExercise.set(r.exercise_id, { exerciseId: r.exercise_id, nameRu: r.name_ru ?? '', sets: [line] });
  }

  return {
    id: s.id,
    title: s.title,
    programDayId: s.program_day_id,
    startedAt: s.started_at,
    finishedAt: s.finished_at,
    exercises: [...byExercise.values()],
    volume: Math.round(volume),
  };
}

/** The previous time this same program day was trained, for a like-for-like diff. */
export function previousSessionFor(programDayId: string | null, before: number): SessionDetail | null {
  if (!programDayId) return null;
  const prev = db.getFirstSync<{ id: string }>(
    `SELECT id FROM workout_sessions
      WHERE program_day_id = ? AND finished_at IS NOT NULL AND started_at < ?
      ORDER BY started_at DESC LIMIT 1`,
    [programDayId, before],
  );
  return prev ? sessionDetail(prev.id) : null;
}

export function saveSessionReview(sessionId: string, content: string) {
  db.runSync('UPDATE workout_sessions SET review = ? WHERE id = ?', [content, sessionId]);
}

export function getSessionReview(sessionId: string): string | null {
  const r = db.getFirstSync<{ review: string | null }>(
    'SELECT review FROM workout_sessions WHERE id = ?',
    [sessionId],
  );
  return r?.review ?? null;
}

export type SessionSummaryRow = SessionRow & { sets: number; volume: number };

/** Finished sessions with their headline numbers, newest first. */
export function sessionHistory(limit = 60): SessionSummaryRow[] {
  return db.getAllSync<SessionSummaryRow>(
    `SELECT ws.*,
            COUNT(ls.id) as sets,
            COALESCE(SUM(ls.weight * ls.reps), 0) as volume
       FROM workout_sessions ws
       LEFT JOIN logged_sets ls ON ls.session_id = ws.id AND ls.completed = 1
      WHERE ws.finished_at IS NOT NULL
      GROUP BY ws.id
      ORDER BY ws.started_at DESC
      LIMIT ?`,
    [limit],
  );
}

export type ExerciseVolume = { exerciseId: string; sets: number; volume: number };

/** Completed work per exercise since a timestamp — grouped into muscles by the caller. */
export function volumeByExercise(since: number): ExerciseVolume[] {
  return db.getAllSync<ExerciseVolume>(
    `SELECT ls.exercise_id as exerciseId,
            COUNT(*) as sets,
            COALESCE(SUM(ls.weight * ls.reps), 0) as volume
       FROM logged_sets ls
       JOIN workout_sessions ws ON ws.id = ls.session_id
      WHERE ls.completed = 1 AND ws.started_at >= ?
      GROUP BY ls.exercise_id`,
    [since],
  );
}

/** Start-of-day timestamps for every finished session, for streaks and calendars. */
export function trainingDays(since: number): number[] {
  const rows = db.getAllSync<{ t: number }>(
    'SELECT started_at as t FROM workout_sessions WHERE finished_at IS NOT NULL AND started_at >= ? ORDER BY started_at ASC',
    [since],
  );
  const days = new Set<number>();
  for (const r of rows) {
    const d = new Date(r.t);
    days.add(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());
  }
  return [...days];
}
