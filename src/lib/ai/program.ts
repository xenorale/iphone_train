import { EXERCISES, getExercise } from '@/lib/catalog';
import type { Exercise, Goal, Phase, Profile } from '@/lib/types';
import { AiError, chatWithFallback, extractJson, FREE_FALLBACK_MODELS, type ChatMessage } from './openrouter';
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
  goal: Goal;
  daysPerWeek: number;
  days: GeneratedDay[];
  phase?: Phase;
  phaseReason?: string;
  weeks: number;
};

const GOAL_RU: Record<Goal, string> = {
  strength: 'максимальная сила',
  muscle: 'набор мышечной массы (гипертрофия)',
  fatloss: 'снижение жира с сохранением мышц',
  general: 'общая физическая форма и здоровье',
};

const EXP_RU = { beginner: 'новичок', intermediate: 'средний уровень', advanced: 'продвинутый' };

/**
 * A COMPACT pool for the prompt — the full catalog (~870) is far too big to send.
 * Filter by equipment, then keep ~6 per muscle group (curated staples first) so
 * every group + cardio + abs is represented while the prompt stays small & fast.
 */
function allowedExercises(profile: Profile): Exercise[] {
  const eq = profile.equipment;
  let pool = eq.length ? EXERCISES.filter((e) => eq.includes(e.equipment)) : EXERCISES;
  if (pool.length < 20) pool = EXERCISES;

  const PER_GROUP = 6;
  const byGroup = new Map<string, Exercise[]>();
  for (const e of pool) {
    const arr = byGroup.get(e.muscleRu);
    if (arr) arr.push(e);
    else byGroup.set(e.muscleRu, [e]);
  }

  const out: Exercise[] = [];
  for (const list of byGroup.values()) {
    // compound lifts first so the model sees the staples of each group
    list.sort((a, b) => Number(b.compound) - Number(a.compound));
    out.push(...list.slice(0, PER_GROUP));
  }
  return out;
}

function buildMessages(profile: Profile, repair?: string): ChatMessage[] {
  const pool = allowedExercises(profile);
  const catalog = pool
    .map((e) => `- ${e.id} — ${e.nameRu} (${e.muscleRu}, ${e.equipmentRu})`)
    .join('\n');

  const system =
    'Ты опытный тренер по силовым тренировкам и специалист по композиции тела. Ты составляешь тренировочные мезоциклы. ' +
    'Отвечай СТРОГО валидным JSON по заданной схеме. Без markdown, без комментариев, без текста вне JSON.';

  const SEX_RU = { male: 'мужской', female: 'женский', unknown: 'не указан' } as const;
  const s = profile.strength;
  const anchors =
    [
      s.chest != null ? `грудь (жим) ${s.chest} кг` : null,
      s.legs != null ? `ноги (присед/жим ногами) ${s.legs} кг` : null,
      s.back != null ? `спина (тяга) ${s.back} кг` : null,
      s.biceps != null ? `бицепс ${s.biceps} кг` : null,
      s.triceps != null ? `трицепс ${s.triceps} кг` : null,
    ]
      .filter(Boolean)
      .join(', ') || 'не указаны — оцени по массе тела, полу и опыту';
  const body = [
    `пол: ${SEX_RU[profile.sex]}`,
    profile.bodyweight != null ? `вес тела: ${profile.bodyweight} кг` : 'вес тела: не указан',
    profile.height != null ? `рост: ${profile.height} см` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const user = `Составь тренировочный мезоцикл (повторяющаяся недельная программа) на 2–3 месяца.

Профиль:
- Цель пользователя: ${GOAL_RU[profile.goal]}
- Уровень: ${EXP_RU[profile.experience]}
- Данные тела: ${body}
- Текущие рабочие веса (вес примерно на 6–8 повторов, НЕ разовый максимум): ${anchors}
- Тренировок в неделю: ${profile.daysPerWeek}
- Длительность тренировки: ~${profile.sessionMinutes} минут

Используй ТОЛЬКО упражнения из этого списка (поле exerciseId должно быть точным id слева):
${catalog}

Правила:
- ФАЗА (phase) должна СООТВЕТСТВОВАТЬ цели: «масса» → "bulk", «сушка» → "cut", «сила» → "bulk", «форма» → "recomp". НЕ ставь "maintain" без веской причины (поддержание — только если человек уже в форме и явно не хочет менять состав тела). В phaseReason 1–2 предложениями по-русски объясни выбор.
- weeks — длительность мезоцикла в неделях (8–12).
- Ровно ${profile.daysPerWeek} тренировочных дней (массив days длиной ${profile.daysPerWeek}).
- На каждый день 5–8 упражнений, базовые (многосуставные) в начале.
- ОБЯЗАТЕЛЬНО в каждом дне: минимум 1 упражнение на пресс (группа «Пресс») и 1 кардио (группа «Кардио») — в конец тренировки. Для cut кардио больше.
- Для кардио в note укажи длительность; sets=1, repMin=1, repMax=1, startWeight=0.
- Диапазон повторений под фазу: сила 3–6, набор 6–12, сушка 10–15, форма 8–12.
- Для КАЖДОГО упражнения укажи startWeight — рекомендуемый стартовый рабочий вес в кг на первый рабочий подход, исходя из текущих силовых, массы тела, пола и опыта. Свой вес и кардио — startWeight=0.
- Укажи rpe (7–9) и restSec: база 120–180, изоляция 60–90.
- Сбалансируй группы мышц по неделе.
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
        { "exerciseId": "id из списка", "sets": 4, "repMin": 6, "repMax": 10, "rpe": 8, "restSec": 120, "startWeight": 40, "note": "" }
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
  if (!id || id.trim().length < 2) return null;
  const direct = getExercise(id);
  if (direct) return { id: direct.id, nameRu: direct.nameRu };
  // fuzzy fallback: match against id / english / russian names
  const lc = id.toLowerCase().replace(/[_\s]+/g, '-');
  const found =
    EXERCISES.find((e) => e.id === lc) ||
    EXERCISES.find((e) => e.id.includes(lc) || lc.includes(e.id)) ||
    EXERCISES.find((e) => e.nameRu.toLowerCase().includes(id.toLowerCase()));
  return found ? { id: found.id, nameRu: found.nameRu } : null;
}

function normalize(parsed: ReturnType<typeof aiProgramSchema.parse>, profile: Profile): GeneratedProgram {
  const days: GeneratedDay[] = [];
  for (const d of parsed.days) {
    const exercises: GeneratedExercise[] = [];
    for (const ex of d.exercises) {
      const resolved = resolveExercise(ex.exerciseId);
      if (!resolved) continue;
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
        startWeight: ex.startWeight != null && ex.startWeight > 0 ? ex.startWeight : undefined,
        note: ex.note?.trim() || undefined,
      });
    }
    if (exercises.length) days.push({ title: d.title, focus: d.focus, exercises });
  }
  if (!days.length) throw new AiError('PARSE', 'no resolvable exercises');
  return {
    name: parsed.name,
    goal: profile.goal,
    daysPerWeek: days.length,
    days,
    phase: parsed.phase,
    phaseReason: parsed.phaseReason?.trim() || undefined,
    weeks: parsed.weeks ?? 10,
  };
}

/** Generate a weekly program. Validates JSON and retries once on failure. */
export async function generateProgram(profile: Profile, model: string): Promise<GeneratedProgram> {
  const models = [...new Set([model, ...FREE_FALLBACK_MODELS])];
  const attempt = async (repair?: string) => {
    const { content } = await chatWithFallback(
      { messages: buildMessages(profile, repair), temperature: 0.5, maxTokens: 4000 },
      models,
    );
    const json = extractJson(content);
    const parsed = aiProgramSchema.parse(json);
    return normalize(parsed, profile);
  };

  try {
    return await attempt();
  } catch (e) {
    const reason = e instanceof Error ? e.message.slice(0, 80) : 'invalid';
    return await attempt(reason);
  }
}
