import type { Exercise, StrengthAnchors } from './types';

/**
 * Starting weights, computed rather than guessed.
 *
 * Asking a language model for "startWeight" produces nonsense like a 17.5 kg
 * bench press, so the model no longer decides loads at all: it picks exercises,
 * we pick the numbers. Anchors the user entered win; without them we fall back
 * to bodyweight-relative standards for a trained young male.
 */

/** Which anchor lift covers which target muscle. */
const ANCHOR_FOR: Record<string, keyof StrengthAnchors> = {
  pectorals: 'chest',
  delts: 'chest',
  triceps: 'triceps',
  biceps: 'biceps',
  forearms: 'biceps',
  lats: 'back',
  'upper back': 'back',
  traps: 'back',
  spine: 'back',
  quads: 'legs',
  hamstrings: 'legs',
  glutes: 'legs',
  calves: 'legs',
  adductors: 'legs',
  abductors: 'legs',
};

/**
 * The anchor lifts aren't all barbell moves, so convert each one back to its
 * barbell equivalent before scaling. A 150 kg leg press is roughly a 75 kg
 * squat, not a 150 kg one.
 */
const ANCHOR_TO_BARBELL: Record<keyof StrengthAnchors, number> = {
  chest: 1, // жим штанги лёжа — эталон
  legs: 1.8, // жим ногами ≈ вдвое больше приседа (см. LEG_FACTOR)
  back: 0.7, // тяга верхнего блока — блочное упражнение (см. EQUIPMENT_FACTOR.cable)
  biceps: 1, // подъём штанги на бицепс — эталон
  triceps: 0.7, // разгибание рук на блоке
};

/**
 * Working weight for ~8 reps on the group's main barbell lift, as a share of
 * bodyweight. Deliberately conservative — undershooting costs one warm-up set,
 * overshooting costs a shoulder.
 */
const BODYWEIGHT_SHARE: Record<string, number> = {
  pectorals: 0.6,
  quads: 0.8,
  hamstrings: 0.5,
  glutes: 0.7,
  lats: 0.6,
  'upper back': 0.55,
  traps: 0.55,
  spine: 0.5,
  delts: 0.35,
  biceps: 0.2,
  triceps: 0.25,
  forearms: 0.15,
  calves: 0.7,
  adductors: 0.3,
  abductors: 0.3,
};

/** Load relative to the same movement with a barbell. */
const EQUIPMENT_FACTOR: Record<string, number> = {
  barbell: 1,
  'olympic barbell': 1,
  'smith machine': 1,
  'trap bar': 1.1,
  'leverage machine': 1.1,
  'ez barbell': 0.8,
  cable: 0.7,
  // dumbbells are per hand
  dumbbell: 0.4,
  kettlebell: 0.35,
  weighted: 0.25,
  'medicine ball': 0.1,
};

/**
 * Legs don't follow the general equipment scaling: a leg press handles far more
 * than a squat, while cable and dumbbell leg work handles far less.
 */
const LEG_MUSCLES = new Set(['quads', 'hamstrings', 'glutes', 'adductors', 'abductors']);

const LEG_FACTOR: Record<string, number> = {
  'leverage machine': 1.8,
  'sled machine': 1.8,
  'smith machine': 1,
  barbell: 1,
  'olympic barbell': 1,
  'trap bar': 1.1,
  dumbbell: 0.35,
  kettlebell: 0.35,
  cable: 0.4,
};

/** Groups where an isolation movement is the norm, not a scaled-down compound. */
const SMALL_MUSCLES = new Set(['biceps', 'triceps', 'delts', 'forearms', 'calves', 'abs']);

/** Exercises that carry no external load. */
const BODYWEIGHT_EQUIPMENT = new Set([
  'body weight',
  'assisted',
  'band',
  'resistance band',
  'rope',
  'stability ball',
  'bosu ball',
  'roller',
  'wheel roller',
  'stationary bike',
  'elliptical machine',
  'stepmill machine',
  'skierg machine',
  'upper body ergometer',
  'sled machine',
  'tire',
  'hammer',
]);

export const roundToPlate = (kg: number) => Math.round(kg / 2.5) * 2.5;

/**
 * Suggested first working weight, in kg. Returns 0 for bodyweight and cardio
 * work, which the UI shows as "—".
 */
export function startingWeight(
  exercise: Exercise,
  anchors: StrengthAnchors,
  bodyweight: number,
): number {
  if (exercise.muscle === 'cardiovascular system') return 0;
  if (exercise.muscle === 'abs') return 0;
  if (BODYWEIGHT_EQUIPMENT.has(exercise.equipment)) return 0;

  // base = what this muscle group handles on a barbell for ~8 reps
  const anchorKey = ANCHOR_FOR[exercise.muscle];
  const anchored = anchorKey ? anchors[anchorKey] : undefined;
  const base =
    anchored != null && anchorKey
      ? anchored / ANCHOR_TO_BARBELL[anchorKey]
      : bodyweight * (BODYWEIGHT_SHARE[exercise.muscle] ?? 0.3);

  const factor = LEG_MUSCLES.has(exercise.muscle)
    ? (LEG_FACTOR[exercise.equipment] ?? 0.5)
    : (EQUIPMENT_FACTOR[exercise.equipment] ?? 0.7);
  let weight = base * factor;

  // a secondary compound or an accessory move is lighter than the group's main lift
  if (!exercise.compound && !SMALL_MUSCLES.has(exercise.muscle)) weight *= 0.55;

  const rounded = roundToPlate(weight);
  return rounded < 2.5 ? 2.5 : rounded;
}

/**
 * Sanity-check a weight the model produced. Anything wildly off the computed
 * value is replaced — that's where "17.5 kg bench" came from.
 */
export function sanitizeWeight(
  proposed: number | undefined,
  exercise: Exercise,
  anchors: StrengthAnchors,
  bodyweight: number,
): number | undefined {
  const computed = startingWeight(exercise, anchors, bodyweight);
  if (computed === 0) return undefined;
  if (proposed == null || proposed <= 0) return computed;
  // trust the model only inside a sane band around our own estimate
  if (proposed < computed * 0.6 || proposed > computed * 1.5) return computed;
  return roundToPlate(proposed);
}
