import { COACH_MODEL, withFallbacks } from './models';
import { chatWithFallback } from './openrouter';

export type CoachScope = 'exercise' | 'workout';

export type AskCoachParams = {
  scope: CoachScope;
  question: string;
  exerciseName?: string;
  muscleRu?: string;
  workoutTitle?: string;
  exercises?: string[];
};

const SYSTEM =
  'Ты опытный персональный тренер и специалист по технике упражнений. ' +
  'Отвечай кратко, конкретно и по-русски, строго по делу. ' +
  'Используй markdown: **Заголовок** для секций и - для пунктов. ' +
  'Если речь о боли — дай безопасные рекомендации и обязательно добавь, что при острой, сильной или непроходящей боли нужно прекратить упражнение и обратиться к врачу. Не ставь диагнозы.';

export async function askCoach(params: AskCoachParams): Promise<string> {
  const ctx =
    params.scope === 'exercise'
      ? `Упражнение: ${params.exerciseName}${params.muscleRu ? ` (целевая группа: ${params.muscleRu})` : ''}.`
      : `Тренировка: ${params.workoutTitle ?? 'текущая'}. Упражнения: ${(params.exercises ?? []).join(', ')}.`;

  const { content } = await chatWithFallback(
    {
      temperature: 0.5,
      maxTokens: 700,
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `${ctx}

Вопрос: ${params.question}

Дай практичный разбор: вероятные причины и что конкретно сделать (техника, на что сделать акцент, подводящие движения, разминка/мобилизация, чем заменить при необходимости). Коротко, по пунктам.`,
        },
      ],
    },
    withFallbacks(COACH_MODEL),
  );
  return content.trim();
}
