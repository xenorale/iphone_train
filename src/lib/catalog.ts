import raw from '@/assets/data/exercises.json';
import type { Exercise } from './types';

export const EXERCISES = raw as Exercise[];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise | undefined {
  return BY_ID.get(id);
}

/** Distinct muscle groups (RU) present in the catalog, with counts. */
export function muscleGroups(): { key: string; label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const e of EXERCISES) map.set(e.muscleRu, (map.get(e.muscleRu) ?? 0) + 1);
  return [...map.entries()]
    .map(([label, count]) => ({ key: label, label, count }))
    .sort((a, b) => b.count - a.count);
}

export function equipmentTypes(): string[] {
  return [...new Set(EXERCISES.map((e) => e.equipmentRu))].sort();
}

export type CatalogFilter = { query?: string; muscle?: string | null; equipment?: string | null };

export function searchExercises({ query, muscle, equipment }: CatalogFilter): Exercise[] {
  const q = query?.trim().toLowerCase();
  return EXERCISES.filter((e) => {
    if (muscle && e.muscleRu !== muscle) return false;
    if (equipment && e.equipmentRu !== equipment) return false;
    if (q && !(e.nameRu.toLowerCase().includes(q) || e.name.toLowerCase().includes(q) || e.muscleRu.toLowerCase().includes(q))) {
      return false;
    }
    return true;
  });
}
