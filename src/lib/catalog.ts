import raw from '@/assets/data/exercises.json';
import type { Exercise } from './types';

export const EXERCISES = raw as Exercise[];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise | undefined {
  return BY_ID.get(id);
}

/** Coarse regions (Грудь, Спина, Ноги…) used as the library's filter chips. */
export function bodyParts(): { key: string; label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const e of EXERCISES) map.set(e.bodyPartRu, (map.get(e.bodyPartRu) ?? 0) + 1);
  return [...map.entries()]
    .map(([label, count]) => ({ key: label, label, count }))
    .sort((a, b) => b.count - a.count);
}

export function equipmentTypes(): string[] {
  return [...new Set(EXERCISES.map((e) => e.equipmentRu))].sort();
}

export type CatalogFilter = { query?: string; bodyPart?: string | null; equipment?: string | null };

export function searchExercises({ query, bodyPart, equipment }: CatalogFilter): Exercise[] {
  const q = query?.trim().toLowerCase();
  return EXERCISES.filter((e) => {
    if (bodyPart && e.bodyPartRu !== bodyPart) return false;
    if (equipment && e.equipmentRu !== equipment) return false;
    if (
      q &&
      !(
        e.nameRu.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.muscleRu.toLowerCase().includes(q)
      )
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Swap candidates for an exercise — same target muscle first, then the same
 * body part. Used by the "заменить упражнение" button when a machine is taken
 * or the movement just doesn't feel right today.
 */
export function alternativesFor(exerciseId: string, limit = 24): Exercise[] {
  const ex = getExercise(exerciseId);
  if (!ex) return [];

  const sameTarget: Exercise[] = [];
  const sameRegion: Exercise[] = [];
  for (const e of EXERCISES) {
    if (e.id === ex.id) continue;
    if (e.muscle === ex.muscle) sameTarget.push(e);
    else if (e.bodyPart === ex.bodyPart) sameRegion.push(e);
  }

  // keep the movement pattern similar: compound swaps for compound
  const rank = (a: Exercise, b: Exercise) =>
    Number(b.compound === ex.compound) - Number(a.compound === ex.compound);

  return [...sameTarget.sort(rank), ...sameRegion.sort(rank)].slice(0, limit);
}
