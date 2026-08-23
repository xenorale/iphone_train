import { getExercise } from '@/lib/catalog';
import { daysSinceLast, lastWorkingSets } from '@/lib/db/sessions';
import type { LoggedSetRow } from '@/lib/types';

export type Target = { sets: number; repMin: number; repMax: number };
export type Suggestion = { weight: number | null; reason: string };

const LOWER_BODY = new Set(['Квадрицепс', 'Бицепс бедра', 'Ягодицы', 'Разгибатели спины']);

/** Weight increment for the next jump, based on the lift. */
export function incrementFor(exerciseId: string): number {
  const ex = getExercise(exerciseId);
  if (ex && LOWER_BODY.has(ex.muscleRu) && ex.compound) return 5;
  return 2.5;
}

export function roundToPlate(weight: number, step = 1.25): number {
  return Math.round(weight / step) * step;
}

/**
 * Double progression: when every working set reaches the top of the rep range,
 * add weight; otherwise hold and chase reps; if reps fall short, back off.
 */
export function suggest(
  sets: LoggedSetRow[],
  target: Target,
  increment: number,
  daysSince?: number | null,
): Suggestion {
  const working = sets.filter((s) => s.weight != null && s.reps != null);
  if (!working.length) {
    return { weight: null, reason: 'Первый раз — подбери вес по ощущениям: тяжело, но с запасом 1–2 повтора.' };
  }

  const topWeight = Math.max(...working.map((s) => s.weight ?? 0));

  // after a layoff, back off the weight and rebuild gradually
  if (daysSince != null && daysSince > 10) {
    return {
      weight: roundToPlate(topWeight * 0.9),
      reason: `Перерыв ${daysSince} дн — снизил вес на ~10%, входи плавно.`,
    };
  }
  const atTop = working.filter((s) => s.weight === topWeight);
  const reps = atTop.map((s) => s.reps ?? 0);
  const enoughSets = atTop.length >= target.sets;
  const allHitMax = reps.length > 0 && reps.every((r) => r >= target.repMax);
  const anyBelowMin = reps.some((r) => r < target.repMin);

  if (allHitMax && enoughSets) {
    return {
      weight: roundToPlate(topWeight + increment),
      reason: `Все подходы на ${target.repMax} — добавь ${increment} кг.`,
    };
  }
  if (anyBelowMin) {
    return {
      weight: topWeight,
      reason: 'В прошлый раз шло тяжело — повтори этот вес и добей повторы.',
    };
  }
  return {
    weight: topWeight,
    reason: `Держи ${topWeight} кг и добавляй повторы до ${target.repMax}.`,
  };
}

/** Convenience: pull last performance + compute a suggestion for an exercise. */
export function suggestNext(exerciseId: string, target: Target): Suggestion {
  const sets = lastWorkingSets(exerciseId);
  return suggest(sets, target, incrementFor(exerciseId), daysSinceLast(exerciseId));
}
