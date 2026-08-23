import { z } from 'zod';

import type { Macros } from '@/lib/db/food';
import { FOOD_MODEL } from '@/lib/store/settings';
import { chatWithFallback, extractJson, FREE_FALLBACK_MODELS } from './openrouter';

const macroSchema = z.object({
  kcal: z.coerce.number().min(0).max(6000).catch(0),
  protein: z.coerce.number().min(0).max(400).catch(0),
  fat: z.coerce.number().min(0).max(400).catch(0),
  carbs: z.coerce.number().min(0).max(800).catch(0),
});

const SYSTEM =
  'Ты диетолог. По описанию еды на русском оцениваешь калории и БЖУ. ' +
  'Порции считай обычными домашними, если размер не указан (тарелка супа ≈ 300 г, ' +
  'порция гарнира ≈ 200 г, котлета ≈ 100 г). ' +
  'Отвечай СТРОГО JSON: {"kcal": число, "protein": число, "fat": число, "carbs": число}. ' +
  'Числа — суммарно за весь описанный приём пищи, в граммах и ккал. Без текста вне JSON.';

/** Turn "овсянка с бананом, кофе с молоком" into numbers. */
export async function estimateMacros(text: string): Promise<Macros> {
  const { content } = await chatWithFallback(
    {
      temperature: 0.2,
      maxTokens: 200,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: text },
      ],
    },
    [...new Set([FOOD_MODEL, ...FREE_FALLBACK_MODELS])],
  );
  const parsed = macroSchema.parse(extractJson(content));
  return {
    kcal: Math.round(parsed.kcal),
    protein: Math.round(parsed.protein),
    fat: Math.round(parsed.fat),
    carbs: Math.round(parsed.carbs),
  };
}
