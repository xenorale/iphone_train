import { age, PROFILE } from './profile';

/**
 * Daily targets for a recomposition phase: eat around maintenance, keep protein
 * high enough to add muscle while leaning out.
 */

export type Targets = { kcal: number; protein: number; fat: number; carbs: number };

/** Mifflin–St Jeor, male. */
export function bmr(bodyweightKg: number): number {
  return Math.round(10 * bodyweightKg + 6.25 * PROFILE.heightCm - 5 * age() + 5);
}

/** Three hard sessions a week plus normal daily movement. */
const ACTIVITY = 1.45;

export function maintenance(bodyweightKg: number): number {
  return Math.round(bmr(bodyweightKg) * ACTIVITY);
}

export function dailyTargets(bodyweightKg: number): Targets {
  // recomp: maintenance minus a small deficit — enough to lean out slowly
  // without stalling the strength work
  const kcal = Math.round(maintenance(bodyweightKg) * 0.95);
  const protein = Math.round(bodyweightKg * 2);
  const fat = Math.round(bodyweightKg * 0.9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, fat, carbs };
}
