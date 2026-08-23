/**
 * Model per job. Not user-configurable — picked once from what the OpenRouter
 * account has access to, balancing reliability against price.
 */

/** Program generation: long prompt, strict JSON, runs once every couple months. */
export const PROGRAM_MODEL = 'google/gemini-3.7-flash';

/** Post-workout review and the in-app coach: cheap, fast, ~12 calls a month. */
export const COACH_MODEL = 'deepseek/deepseek-v4-flash';

/** Food parsing: shortest prompts, several calls a day, lowest latency wins. */
export const FOOD_MODEL = 'google/gemini-2.5-flash-lite';

/** Tried in order when the primary model is rate-limited or down. */
export const FALLBACK_MODELS = [
  'deepseek/deepseek-v4-flash',
  'google/gemini-2.5-flash-lite',
  'nvidia/nemotron-3.5-lightning:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
];

/** Primary first, then fallbacks, without repeats. */
export const withFallbacks = (primary: string) => [...new Set([primary, ...FALLBACK_MODELS])];
