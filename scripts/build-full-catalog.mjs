// Builds the FULL exercise catalog (~870) from free-exercise-db, with Russian
// names translated by an LLM (OpenRouter) and cached on disk.
//
// Run once with your key (used only locally, never stored):
//   OPENROUTER_API_KEY=sk-or-... node scripts/build-full-catalog.mjs
//
// Re-runs reuse scripts/.name-cache.json, so only new names cost tokens.
// Curated entries in assets/data/exercises.json (clean names + cues) are kept as overrides.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../assets/data/exercises.json');
const CACHE = resolve(__dirname, '.name-cache.json');
const LOCAL = 'D:/tmp/fed.json';
const SRC_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

const KEY = process.env.OPENROUTER_API_KEY;
const MODELS = [
  'openai/gpt-oss-120b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
];

const MUSCLE_RU = {
  chest: 'Грудь', 'middle back': 'Спина', lats: 'Широчайшие', 'lower back': 'Поясница',
  traps: 'Трапеции', neck: 'Шея', shoulders: 'Плечи', biceps: 'Бицепс', triceps: 'Трицепс',
  forearms: 'Предплечья', quadriceps: 'Квадрицепс', hamstrings: 'Бицепс бедра', glutes: 'Ягодицы',
  calves: 'Икры', abdominals: 'Пресс', adductors: 'Приводящие', abductors: 'Отводящие',
};
const EQUIP_RU = {
  barbell: 'Штанга', dumbbell: 'Гантели', cable: 'Блок', machine: 'Тренажёр', 'body only': 'Своё тело',
  kettlebells: 'Гири', bands: 'Резина', 'e-z curl bar': 'EZ-гриф', 'exercise ball': 'Фитбол',
  'medicine ball': 'Мяч', 'foam roll': 'Ролик', other: 'Прочее', none: 'Без инвентаря',
};
const LEVEL_RU = { beginner: 'Новичок', intermediate: 'Средний', expert: 'Продвинутый' };

const slug = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function loadSource() {
  if (existsSync(LOCAL)) return JSON.parse(readFileSync(LOCAL, 'utf8'));
  const res = await fetch(SRC_URL);
  return res.json();
}

function loadCache() {
  if (existsSync(CACHE)) return JSON.parse(readFileSync(CACHE, 'utf8'));
  return {};
}

function extractJson(text) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const t = (fence ? fence[1] : text).trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('no json');
  return JSON.parse(t.slice(start, end + 1));
}

async function translateBatch(names) {
  const body = {
    temperature: 0.2,
    max_tokens: 2000,
    messages: [
      { role: 'system', content: 'Ты переводишь названия упражнений из спортзала на естественный русский, как сказал бы тренер. Отвечай ТОЛЬКО JSON-объектом {английское: русское}. Без пояснений.' },
      { role: 'user', content: 'Переведи на русский:\n' + JSON.stringify(names) },
    ],
  };
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, model }),
        });
        if (!res.ok) {
          if ([429, 500, 502, 503].includes(res.status)) { await new Promise((r) => setTimeout(r, 1500)); continue; }
          break; // try next model
        }
        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content;
        if (content) return extractJson(content);
      } catch {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }
  return {}; // give up this batch -> English fallback
}

async function main() {
  if (!KEY) {
    console.error('Set OPENROUTER_API_KEY env var. Example:\n  OPENROUTER_API_KEY=sk-or-... node scripts/build-full-catalog.mjs');
    process.exit(1);
  }

  const data = (await loadSource()).filter((x) => x.images?.length);
  const overrides = existsSync(OUT)
    ? Object.fromEntries(JSON.parse(readFileSync(OUT, 'utf8')).map((e) => [e.id, e]))
    : {};
  const cache = loadCache();

  // gather names needing translation
  const need = [...new Set(data.map((x) => x.name).filter((n) => !cache[n]))];
  console.log(`exercises: ${data.length} | to translate: ${need.length}`);

  const BATCH = 40;
  for (let i = 0; i < need.length; i += BATCH) {
    const chunk = need.slice(i, i + BATCH);
    const map = await translateBatch(chunk);
    for (const n of chunk) cache[n] = (map[n] || '').toString().trim() || n; // fallback to English
    writeFileSync(CACHE, JSON.stringify(cache, null, 2));
    console.log(`  translated ${Math.min(i + BATCH, need.length)}/${need.length}`);
  }

  const out = data.map((src) => {
    const id = slug(src.id);
    if (overrides[id]) return overrides[id]; // keep curated (clean name + cues)
    const isCardio = src.category === 'cardio';
    return {
      id,
      name: src.name,
      nameRu: cache[src.name] || src.name,
      muscle: isCardio ? 'cardio' : (src.primaryMuscles[0] ?? 'other'),
      muscleRu: isCardio ? 'Кардио' : (MUSCLE_RU[src.primaryMuscles[0]] ?? src.primaryMuscles[0] ?? 'Другое'),
      secondaryRu: (src.secondaryMuscles ?? []).map((m) => MUSCLE_RU[m] ?? m),
      equipment: src.equipment ?? 'other',
      equipmentRu: EQUIP_RU[src.equipment] ?? src.equipment ?? 'Прочее',
      level: src.level ?? 'beginner',
      levelRu: LEVEL_RU[src.level] ?? 'Новичок',
      mechanic: src.mechanic ?? null,
      category: src.category ?? 'strength',
      cues: [],
      instructionsEn: [],
      images: (src.images ?? []).map((p) => IMG_BASE + p),
    };
  });

  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`Wrote ${out.length} exercises -> ${OUT}`);
}

main();
