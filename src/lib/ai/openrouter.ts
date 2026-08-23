import { getApiKey } from './key';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export type ChatRole = 'system' | 'user' | 'assistant';
export type ChatMessage = { role: ChatRole; content: string };

export type AiErrorCode = 'NO_KEY' | 'HTTP' | 'EMPTY' | 'PARSE' | 'NETWORK';

export class AiError extends Error {
  code: AiErrorCode;
  constructor(code: AiErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
  /** Russian, user-facing. */
  get human(): string {
    switch (this.code) {
      case 'NO_KEY':
        return 'Не указан ключ OpenRouter. Добавь его в разделе «Ещё».';
      case 'HTTP':
        if (this.message.startsWith('429'))
          return 'Модель перегружена (лимит бесплатной версии). Подожди немного и попробуй снова — или выбери другую модель в «Ещё».';
        if (this.message.startsWith('401') || this.message.startsWith('403'))
          return 'Ключ отклонён. Проверь ключ OpenRouter в разделе «Ещё».';
        if (this.message.startsWith('402'))
          return 'Недостаточно кредитов на OpenRouter. Пополни баланс или выбери бесплатную модель.';
        return `Ошибка от OpenRouter: ${this.message}`;
      case 'EMPTY':
        return 'Модель вернула пустой ответ. Попробуй другую модель.';
      case 'PARSE':
        return 'Не удалось разобрать ответ модели. Попробуй ещё раз.';
      case 'NETWORK':
        return 'Нет связи с сервером. Проверь интернет.';
    }
  }
}

export type ChatOptions = {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  maxAttempts?: number;
};

const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Reliable free models on OpenRouter, tried in order when one is rate-limited. */
export const FREE_FALLBACK_MODELS = [
  'openai/gpt-oss-120b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
];

export async function chat({
  messages,
  model,
  temperature = 0.6,
  maxTokens = 4000,
  signal,
  maxAttempts = 3,
}: ChatOptions): Promise<string> {
  const key = await getApiKey();
  if (!key) throw new AiError('NO_KEY');

  const body = JSON.stringify({ model, messages, temperature, max_tokens: maxTokens });
  let lastError: AiError = new AiError('NETWORK');

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // exponential-ish backoff between retries (free models are often briefly overloaded)
    if (attempt > 0) await sleep(700 * attempt + Math.floor(Math.random() * 400));

    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://volt.fitness',
          'X-Title': 'VOLT',
        },
        body,
        signal,
      });
    } catch {
      lastError = new AiError('NETWORK');
      continue;
    }

    if (res.ok) {
      const json = await res.json().catch(() => null);
      const content: string | undefined = json?.choices?.[0]?.message?.content;
      if (!content) throw new AiError('EMPTY');
      return content;
    }

    let detail = `${res.status}`;
    try {
      const errBody = await res.json();
      detail = `${res.status} ${errBody?.error?.message ?? ''}`.trim();
    } catch {
      // ignore
    }
    lastError = new AiError('HTTP', detail);
    if (!RETRYABLE.has(res.status)) throw lastError;
  }

  throw lastError;
}

/**
 * Try several models in order, moving to the next when one is rate-limited /
 * unavailable. Lets free-tier users get a result even when a model returns 429.
 */
export async function chatWithFallback(
  opts: Omit<ChatOptions, 'model' | 'maxAttempts'>,
  models: string[],
): Promise<{ content: string; model: string }> {
  let lastError: AiError = new AiError('EMPTY');
  for (const model of models) {
    try {
      const content = await chat({ ...opts, model, maxAttempts: 2 });
      return { content, model };
    } catch (e) {
      if (!(e instanceof AiError)) throw e;
      if (e.code === 'NO_KEY') throw e; // no point trying other models
      lastError = e;
    }
  }
  throw lastError;
}

/** Pull the first valid JSON object/array out of a model response (handles code fences & prose). */
export function extractJson(text: string): unknown {
  let t = text.trim();
  // strip ```json ... ``` fences
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();

  // find outermost { } or [ ]
  const start = t.search(/[{[]/);
  if (start === -1) throw new AiError('PARSE');
  const open = t[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  for (let i = start; i < t.length; i++) {
    if (t[i] === open) depth++;
    else if (t[i] === close) {
      depth--;
      if (depth === 0) {
        const slice = t.slice(start, i + 1);
        try {
          return JSON.parse(slice);
        } catch {
          throw new AiError('PARSE');
        }
      }
    }
  }
  throw new AiError('PARSE');
}
