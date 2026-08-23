/**
 * VOLT is a single-user app. Everything that used to be a six-step onboarding
 * wizard lives here as constants — only the numbers that actually change over
 * time (bodyweight, working weights) are stored and editable.
 */

export const PROFILE = {
  name: 'Влад',
  heightCm: 190,
  /** ISO date — age is derived, never stored. */
  birthDate: '2005-08-16',
  sex: 'male' as const,
  daysPerWeek: 3,
  sessionMinutes: 75,
  /** Used until the first body metric is logged. */
  fallbackBodyweight: 92.5,
  /** Full commercial gym. */
  equipment: [
    'barbell',
    'dumbbell',
    'cable',
    'leverage machine',
    'smith machine',
    'body weight',
    'ez barbell',
    'kettlebell',
    'assisted',
    'weighted',
  ],
  /** Free-form goal handed to the model verbatim — richer than an enum. */
  goal:
    'Одновременно рельеф и рост силовых. Хочет стать заметно больше и сильнее, ' +
    'сохраняя сухость. Приоритет — тяжёлая база с прогрессией весов.',
  /** Pull-ups, dips and other bodyweight work mixed into the barbell sessions. */
  wantsCalisthenics: true,
  /** Every session ends with direct ab work. */
  absEveryWorkout: true,
  /**
   * Не программировать: приседания и любые тяги с пола (становая, румынская,
   * мёртвая) со свободным весом. Версии в Смите и на тренажёрах — можно.
   */
  excludedPatterns: [/squat/i, /deadlift/i],
  /** Снаряды, на которых эти движения всё же допустимы. */
  excludedUnlessEquipment: ['smith machine', 'leverage machine', 'sled machine'],
} as const;

export function age(on: Date = new Date()): number {
  const born = new Date(PROFILE.birthDate);
  let years = on.getFullYear() - born.getFullYear();
  const monthDiff = on.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && on.getDate() < born.getDate())) years -= 1;
  return years;
}

/** Body mass index — a rough anchor for the model's calorie and phase advice. */
export function bmi(bodyweightKg: number): number {
  const m = PROFILE.heightCm / 100;
  return Math.round((bodyweightKg / (m * m)) * 10) / 10;
}
