import type { SessionDetail } from '@/lib/db/sessions';
import { age, PROFILE } from '@/lib/profile';
import { COACH_MODEL, withFallbacks } from './models';
import { chatWithFallback } from './openrouter';

const SYSTEM =
  'Ты персональный тренер. Разбираешь только что завершённую тренировку. ' +
  'Пиши по-русски, коротко и конкретно, без воды и без похвалы ради похвалы. ' +
  'Используй markdown: **Заголовок** для секций и - для пунктов. ' +
  'Если данных мало — скажи прямо, не выдумывай.';

function describe(session: SessionDetail): string {
  return session.exercises
    .map((ex) => {
      const sets = ex.sets.map((s) => `${s.weight ?? 0}×${s.reps ?? 0}`).join(', ');
      return `- ${ex.nameRu}: ${sets}`;
    })
    .join('\n');
}

/** Post-workout debrief: what moved, what stalled, what to change next time. */
export async function reviewWorkout(
  session: SessionDetail,
  previous: SessionDetail | null,
): Promise<string> {
  const minutes = session.finishedAt
    ? Math.max(1, Math.round((session.finishedAt - session.startedAt) / 60000))
    : null;

  const comparison = previous
    ? `\n\nТа же тренировка в прошлый раз (объём ${previous.volume} кг):\n${describe(previous)}`
    : '\n\nПрошлых данных по этой тренировке нет — это первый раз.';

  const { content } = await chatWithFallback(
    {
      temperature: 0.4,
      maxTokens: 700,
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `Атлет: ${PROFILE.name}, ${age()} лет, ${PROFILE.heightCm} см. Цель: ${PROFILE.goal}

Тренировка «${session.title ?? 'без названия'}»${minutes ? `, ${minutes} мин` : ''}, суммарный объём ${session.volume} кг:
${describe(session)}${comparison}

Дай разбор строго в таком формате:
**Итог**
- 2 пункта: что получилось, общая оценка нагрузки
**Прогресс**
- где веса или повторы выросли, а где встали (сравни с прошлым разом, если он есть)
**Что поправить**
- 2–3 конкретных пункта на следующую тренировку: какие веса ставить, где добавить повторы, что снизить`,
        },
      ],
    },
    withFallbacks(COACH_MODEL),
  );
  return content.trim();
}
