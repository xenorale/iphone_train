import type { GeneratedProgram } from '@/lib/ai/program';
import type { ProgramDayRow, ProgramExerciseRow, ProgramRow } from '@/lib/types';
import { uid } from '@/lib/uid';
import { db } from './index';

export type LoadedDay = ProgramDayRow & { exercises: ProgramExerciseRow[] };
export type LoadedProgram = ProgramRow & { days: LoadedDay[] };

export function saveProgram(gen: GeneratedProgram): string {
  const programId = uid('prog_');
  db.withTransactionSync(() => {
    db.runSync('UPDATE programs SET is_active = 0 WHERE is_active = 1');
    db.runSync(
      `INSERT INTO programs
         (id, name, goal, days_per_week, created_at, is_active, weeks, phase, phase_reason, current_week, week_started_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, 1, ?)`,
      [
        programId,
        gen.name,
        gen.goal,
        gen.daysPerWeek,
        Date.now(),
        gen.weeks ?? null,
        gen.phase ?? null,
        gen.phaseReason ?? null,
        Date.now(),
      ],
    );
    gen.days.forEach((d, di) => {
      const dayId = uid('day_');
      db.runSync(
        'INSERT INTO program_days (id, program_id, day_index, title, focus) VALUES (?, ?, ?, ?, ?)',
        [dayId, programId, di, d.title, d.focus ?? null],
      );
      d.exercises.forEach((ex, oi) => {
        db.runSync(
          `INSERT INTO program_exercises
             (id, day_id, exercise_id, name_ru, order_index, sets, rep_min, rep_max, target_rpe, rest_seconds, notes, start_weight)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uid('pex_'),
            dayId,
            ex.exerciseId,
            ex.nameRu,
            oi,
            ex.sets,
            ex.repMin,
            ex.repMax,
            ex.rpe ?? null,
            ex.restSec ?? null,
            ex.note ?? null,
            ex.startWeight ?? null,
          ],
        );
      });
    });
  });
  return programId;
}

export function getActiveProgram(): LoadedProgram | null {
  const p = db.getFirstSync<ProgramRow>(
    'SELECT * FROM programs WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1',
  );
  if (!p) return null;
  const days = db.getAllSync<ProgramDayRow>(
    'SELECT * FROM program_days WHERE program_id = ? ORDER BY day_index',
    [p.id],
  );
  return {
    ...p,
    days: days.map((d) => ({
      ...d,
      exercises: db.getAllSync<ProgramExerciseRow>(
        'SELECT * FROM program_exercises WHERE day_id = ? ORDER BY order_index',
        [d.id],
      ),
    })),
  };
}

export function advanceWeek(programId: string) {
  db.runSync(
    'UPDATE programs SET current_week = COALESCE(current_week, 1) + 1, week_started_at = ? WHERE id = ?',
    [Date.now(), programId],
  );
}

export function extendProgram(programId: string, byWeeks: number) {
  db.runSync('UPDATE programs SET weeks = COALESCE(weeks, 0) + ? WHERE id = ?', [byWeeks, programId]);
}

export function getProgramDay(dayId: string): LoadedDay | null {
  const d = db.getFirstSync<ProgramDayRow>('SELECT * FROM program_days WHERE id = ?', [dayId]);
  if (!d) return null;
  return {
    ...d,
    exercises: db.getAllSync<ProgramExerciseRow>(
      'SELECT * FROM program_exercises WHERE day_id = ? ORDER BY order_index',
      [d.id],
    ),
  };
}

/**
 * Swap one exercise inside the program for another (machine taken, sore joint,
 * just don't feel like it). Sets/reps/rest stay — only the movement changes.
 */
export function replaceProgramExercise(pexId: string, exerciseId: string, nameRu: string) {
  db.runSync(
    'UPDATE program_exercises SET exercise_id = ?, name_ru = ?, start_weight = NULL WHERE id = ?',
    [exerciseId, nameRu, pexId],
  );
}
