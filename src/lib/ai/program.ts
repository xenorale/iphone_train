import { EXERCISES, getExercise } from '@/lib/catalog';
import { age, bmi, PROFILE } from '@/lib/profile';
import type { Exercise, Phase, StrengthAnchors } from '@/lib/types';
import { AiError, chatWithFallback, extractJson, type ChatMessage } from './openrouter';
import { sanitizeWeight } from '@/lib/strength-standards';
import { PROGRAM_MODEL, withFallbacks } from './models';
import { aiProgramSchema } from './schemas';

export type GeneratedExercise = {
  exerciseId: string;
  nameRu: string;
  sets: number;
  repMin: number;
  repMax: number;
  rpe?: number;
  restSec?: number;
  startWeight?: number;
  note?: string;
};
export type GeneratedDay = { title: string; focus?: string; exercises: GeneratedExercise[] };
export type GeneratedProgram = {
  name: string;
  goal: string;
  daysPerWeek: number;
  days: GeneratedDay[];
  phase?: Phase;
  phaseReason?: string;
  weeks: number;
};

export type ProgramInput = {
  strength: StrengthAnchors;
  bodyweight: number;
};

/** Epley, reversed: a working weight for ~7 reps implies this one-rep max. */
export function estimateOneRm(workingWeight: number, reps = 7): number {
  return Math.round(workingWeight * (1 + reps / 30));
}

/**
 * A COMPACT pool for the prompt — the full catalog (1324) is far too big to
 * send. Filter by the gym's equipment, then keep a handful per muscle so every
 * group, plus abs and calisthenics, stays represented.
 */
function allowedExercises(): Exercise[] {
  const gymEquipment: readonly string[] = PROFILE.equipment;
  const stillAllowed: readonly string[] = PROFILE.excludedUnlessEquipment;
  const isExcluded = (e: Exercise) =>
    PROFILE.excludedPatterns.some((re) => re.test(e.name)) && !stillAllowed.includes(e.equipment);
  const pool = EXERCISES.filter((e) => gymEquipment.includes(e.equipment) && !isExcluded(e));

  const PER_GROUP = 8;
  const byGroup = new Map<string, Exercise[]>();
  for (const e of pool) {
    const arr = byGroup.get(e.muscleRu);
    if (arr) arr.push(e);
    else byGroup.set(e.muscleRu, [e]);
  }

  const out: Exercise[] = [];
  for (const list of byGroup.values()) {
    // compound staples first — they anchor each session
    list.sort((a, b) => Number(b.compound) - Number(a.compound));
    out.push(...list.slice(0, PER_GROUP));
  }

  // guarantee bodyweight pulling/pushing is on the menu for the calisthenics part
  const calisthenics = pool
    .filter((e) => e.equipment === 'body weight' && e.compound && !out.includes(e))
    .slice(0, 12);

  // machines the model would otherwise never see — one entry each, they matter
  // for the cardio finisher
  const cardioMachines = pool.filter(
    (e) => e.muscle === 'cardiovascular system' && e.equipment !== 'body weight' && !out.includes(e),
  );

  return [...out, ...calisthenics, ...cardioMachines];
}

function buildMessages(input: ProgramInput, repair?: string): ChatMessage[] {
  const pool = allowedExercises();
  const catalog = pool
    .map((e) => `- ${e.id} — ${e.nameRu} (${e.muscleRu}, ${e.equipmentRu})`)
    .join('\n');

  const s = input.strength;
  const anchor = (label: string, kg?: number) =>
    kg != null ? `${label}: рабочий ${kg} кг × 6–8 → примерный 1ПМ ${estimateOneRm(kg)} кг` : null;
  const anchors =
    [
      anchor('Грудь (жим)', s.chest),
      anchor('Ноги (присед/жим ногами)', s.legs),
      anchor('Спина (тяга)', s.back),
      anchor('Бицепс', s.biceps),
      anchor('Трицепс', s.triceps),
    ]
      .filter(Boolean)
      .join('\n') || 'не указаны — оцени по массе тела, росту, возрасту и полу';

  const system =
    'Ты опытный тренер по силовым тренировкам и специалист по композиции тела. ' +
    'Ты составляешь тренировочные мезоциклы. ' +
    'Отвечай СТРОГО валидным JSON по заданной схеме. Без markdown, без комментариев, без текста вне JSON.';

  const user = `Составь тренировочный мезоцикл (повторяющаяся недельная программа) на 2–3 месяца.

Кто тренируется:
- ${PROFILE.name}, ${age()} лет, мужчина, рост ${PROFILE.heightCm} см, вес ${input.bodyweight} кг (ИМТ ${bmi(input.bodyweight)})
- Цель: ${PROFILE.goal}
- Тренировок в неделю: ${PROFILE.daysPerWeek}, по ~${PROFILE.sessionMinutes} минут
- Зал полностью оборудован

Текущие силовые:
${anchors}

Используй ТОЛЬКО упражнения из этого списка (exerciseId должен быть точным id слева):
${catalog}

Правила:
- Ровно ${PROFILE.daysPerWeek} тренировочных дней (массив days длиной ${PROFILE.daysPerWeek}).
- 6–8 упражнений в день, тяжёлая база в начале, изоляция в конце.
- ОБЯЗАТЕЛЬНО в каждом дне минимум одно упражнение на пресс (группа «Пресс»).
- ОБЯЗАТЕЛЬНО в каждом дне 1–2 упражнения с собственным весом (подтягивания, брусья, отжимания) — вперемешку с железом, а не отдельным блоком в конце.
- ОБЯЗАТЕЛЬНО последним упражнением каждого дня — кардио (группа «Кардио») на ${PROFILE.cardioMinutes} минут: sets=1, repMin=1, repMax=1, в note укажи длительность и темп. Оно нужно для рельефа и не должно мешать восстановлению.
- Рабочие веса НЕ указывай — их считает само приложение по силовым атлета. Твоя задача: подобрать упражнения, подходы и повторы.
- Цель совмещает рельеф и силу → phase = "recomp", если нет веской причины иначе. В phaseReason объясни выбор 1–2 предложениями по-русски.
- weeks — длительность мезоцикла (8–12).
- Укажи rpe (7–9) и restSec: база 150–210, изоляция 60–90.
- Сбалансируй жим и тягу по неделе, ноги не пропускай.
- note — короткая подсказка по-русски (необязательно).

Схема JSON:
{
  "name": "string — название по-русски",
  "phase": "bulk|cut|recomp|maintain",
  "phaseReason": "string — почему эта фаза, по-русски",
  "weeks": 10,
  "days": [
    {
      "title": "string — напр. 'День 1 — Грудь и трицепс'",
      "focus": "string — основные группы",
      "exercises": [
        { "exerciseId": "id из списка", "sets": 4, "repMin": 6, "repMax": 10, "rpe": 8, "restSec": 150, "note": "" }
      ]
    }
  ]
}${repair ? `\n\nПРЕДЫДУЩИЙ ОТВЕТ БЫЛ НЕВАЛИДЕН (${repair}). Верни ТОЛЬКО корректный JSON по схеме.` : ''}`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

function resolveExercise(id: string): { id: string; nameRu: string } | null {
  if (!id || id.trim().length < 1) return null;
  const direct = getExercise(id.trim());
  if (direct) return { id: direct.id, nameRu: direct.nameRu };
  // ids are zero-padded ("0007"); models like to drop the padding
  const padded = getExercise(id.trim().padStart(4, '0'));
  if (padded) return { id: padded.id, nameRu: padded.nameRu };
  const lc = id.toLowerCase().trim();
  const found =
    EXERCISES.find((e) => e.nameRu.toLowerCase() === lc) ||
    EXERCISES.find((e) => e.name.toLowerCase() === lc) ||
    EXERCISES.find((e) => e.nameRu.toLowerCase().includes(lc));
  return found ? { id: found.id, nameRu: found.nameRu } : null;
}

function normalize(
  parsed: ReturnType<typeof aiProgramSchema.parse>,
  input: ProgramInput,
): GeneratedProgram {
  const days: GeneratedDay[] = [];
  for (const d of parsed.days) {
    const exercises: GeneratedExercise[] = [];
    for (const ex of d.exercises) {
      const resolved = resolveExercise(ex.exerciseId);
      if (!resolved) continue;
      const catalogEntry = getExercise(resolved.id)!;
      const repMin = Math.min(ex.repMin, ex.repMax);
      const repMax = Math.max(ex.repMin, ex.repMax);
      exercises.push({
        exerciseId: resolved.id,
        nameRu: resolved.nameRu,
        sets: ex.sets,
        repMin,
        repMax,
        rpe: ex.rpe,
        restSec: ex.restSec,
        startWeight: sanitizeWeight(ex.startWeight, catalogEntry, input.strength, input.bodyweight),
        note: ex.note?.trim() || undefined,
      });
    }
    if (exercises.length) days.push({ title: d.title, focus: d.focus, exercises });
  }
  if (!days.length) throw new AiError('PARSE', 'no resolvable exercises');
  return {
    name: parsed.name,
    goal: PROFILE.goal,
    daysPerWeek: days.length,
    days,
    phase: parsed.phase,
    phaseReason: parsed.phaseReason?.trim() || undefined,
    weeks: parsed.weeks ?? 10,
  };
}

/** Generate a weekly program. Validates JSON and retries once on failure. */
export async function generateProgram(input: ProgramInput): Promise<GeneratedProgram> {
  const models = withFallbacks(PROGRAM_MODEL);
  const attempt = async (repair?: string) => {
    const { content } = await chatWithFallback(
      { messages: buildMessages(input, repair), temperature: 0.5, maxTokens: 5000 },
      models,
    );
    return normalize(aiProgramSchema.parse(extractJson(content)), input);
  };

  try {
    return await attempt();
  } catch (e) {
    const reason = e instanceof Error ? e.message.slice(0, 80) : 'invalid';
    return await attempt(reason);
  }
}
