import { z } from 'zod';

// Lenient by design: models occasionally return an out-of-range value (e.g. restSec=0
// for cardio). `.catch()` substitutes a sane default instead of failing the WHOLE program.

export const aiExerciseSchema = z.object({
  exerciseId: z.string().catch(''),
  sets: z.coerce.number().int().min(1).max(12).catch(3),
  repMin: z.coerce.number().int().min(1).max(60).catch(8),
  repMax: z.coerce.number().int().min(1).max(60).catch(12),
  rpe: z.coerce.number().min(5).max(10).optional().catch(undefined),
  restSec: z.coerce.number().int().min(0).max(1200).optional().catch(undefined),
  startWeight: z.coerce.number().min(0).max(600).optional().catch(undefined),
  note: z.string().optional().catch(undefined),
});

export const aiDaySchema = z.object({
  title: z.string().catch('Тренировка'),
  focus: z.string().optional().catch(undefined),
  exercises: z.array(aiExerciseSchema).catch([]),
});

export const aiProgramSchema = z.object({
  name: z.string().catch('Моя программа'),
  phase: z.enum(['cut', 'bulk', 'recomp', 'maintain']).optional().catch(undefined),
  phaseReason: z.string().optional().catch(undefined),
  weeks: z.coerce.number().int().min(4).max(16).optional().catch(undefined),
  days: z.array(aiDaySchema).min(1),
});

export type AiProgram = z.infer<typeof aiProgramSchema>;
export type AiDay = z.infer<typeof aiDaySchema>;
export type AiExercise = z.infer<typeof aiExerciseSchema>;
