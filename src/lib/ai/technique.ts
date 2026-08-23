import type { Exercise } from '@/lib/types';
import { chatWithFallback, FREE_FALLBACK_MODELS } from './openrouter';

export async function explainTechnique(exercise: Exercise, model: string): Promise<string> {
  const { content } = await chatWithFallback(
    {
    temperature: 0.5,
    maxTokens: 900,
    messages: [
      {
        role: 'system',
        content:
          'Ты опытный тренер по силовым. Объясняешь технику упражнений кратко и точно, по-русски. ' +
          'Используй markdown: **Заголовок** для секций и - для пунктов. Без вступлений и воды.',
      },
      {
        role: 'user',
        content: `Упражнение: ${exercise.nameRu} (${exercise.name}). Целевая группа: ${exercise.muscleRu}. Инвентарь: ${exercise.equipmentRu}.

Дай разбор техники строго в таком формате:
**Исходное положение**
- 2–3 коротких пункта
**Выполнение**
- 3–4 коротких пункта
**Частые ошибки**
- 3 пункта
**Дыхание**
- 1 пункт`,
      },
    ],
    },
    [...new Set([model, ...FREE_FALLBACK_MODELS])],
  );
  return content.trim();
}
