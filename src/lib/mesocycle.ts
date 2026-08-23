import type { LoadedProgram } from '@/lib/db/programs';
import { sessionCountSince } from '@/lib/db/sessions';

/**
 * Progress through the training block.
 *
 * The schedule floats — Влад trains whenever he gets to the gym — so progress
 * is counted in completed sessions, not calendar weeks. One "круг" is one pass
 * through every day of the program.
 */
export type CycleProgress = {
  /** Sessions finished since the program was generated. */
  done: number;
  /** Sessions in one full pass through the program. */
  perCycle: number;
  /** Current pass, 1-based. */
  cycle: number;
  totalCycles: number;
  totalSessions: number;
  /** 0..1 through the whole block. */
  progress: number;
  complete: boolean;
};

export function cycleProgress(program: LoadedProgram): CycleProgress {
  // always derive from the actual days, so every screen agrees
  const perCycle = Math.max(1, program.days.length);
  const totalCycles = program.weeks ?? 0;
  const totalSessions = totalCycles * perCycle;
  const done = sessionCountSince(program.created_at);
  const cycle = totalCycles
    ? Math.min(totalCycles, Math.floor(done / perCycle) + 1)
    : Math.floor(done / perCycle) + 1;

  return {
    done,
    perCycle,
    cycle,
    totalCycles,
    totalSessions,
    progress: totalSessions ? Math.min(1, done / totalSessions) : 0,
    complete: totalSessions > 0 && done >= totalSessions,
  };
}

/** Index of the next day to train — the rotation just continues where it left off. */
export function nextDayIndex(program: LoadedProgram): number {
  if (!program.days.length) return 0;
  return sessionCountSince(program.created_at) % program.days.length;
}
