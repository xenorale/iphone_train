// Builds assets/data/exercises.json + src/lib/gif-map.ts from the Gym Visual
// dataset (scripts/gifdb-source.json, 1324 exercises with GIFs).
//
// Russian exercise names are translated once via OpenRouter and cached on disk:
//   OPENROUTER_API_KEY=sk-or-... node scripts/build-catalog.mjs
//
// Without a key the script still runs — untranslated names stay English, and a
// later run with a key fills them in (scripts/.name-cache.json is reused).

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, 'gifdb-source.json');
const CACHE = resolve(__dirname, '.name-cache.json');
const OUT = resolve(__dirname, '../assets/data/exercises.json');
const GIF_MAP = resolve(__dirname, '../src/lib/gif-map.ts');

const KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'google/gemini-2.5-flash-lite';
const BATCH = 40;

// ---- taxonomy (hand-translated: 19 targets, 40 secondaries, 29 equipment) ----

const TARGET_RU = {
  abs: 'Пресс',
  quads: 'Квадрицепс',
  lats: 'Широчайшие',
  calves: 'Икры',
  pectorals: 'Грудь',
  glutes: 'Ягодицы',
  hamstrings: 'Бицепс бедра',
  adductors: 'Приводящие',
  triceps: 'Трицепс',
  'cardiovascular system': 'Кардио',
  spine: 'Разгибатели спины',
  'upper back': 'Верх спины',
  biceps: 'Бицепс',
  delts: 'Плечи',
  forearms: 'Предплечья',
  traps: 'Трапеции',
  'serratus anterior': 'Зубчатые',
  abductors: 'Отводящие',
  'levator scapulae': 'Шея',
};

const SECONDARY_RU = {
  abdominals: 'пресс',
  'ankle stabilizers': 'стабилизаторы голеностопа',
  ankles: 'голеностоп',
  back: 'спина',
  biceps: 'бицепс',
  brachialis: 'плечевая мышца',
  calves: 'икры',
  chest: 'грудь',
  core: 'кор',
  deltoids: 'дельты',
  feet: 'стопы',
  forearms: 'предплечья',
  glutes: 'ягодицы',
  'grip muscles': 'хват',
  groin: 'приводящие',
  hamstrings: 'бицепс бедра',
  hands: 'кисти',
  'hip flexors': 'сгибатели бедра',
  'inner thighs': 'внутренняя поверхность бедра',
  'latissimus dorsi': 'широчайшие',
  lats: 'широчайшие',
  'lower abs': 'низ пресса',
  'lower back': 'поясница',
  obliques: 'косые',
  quadriceps: 'квадрицепс',
  'rear deltoids': 'задние дельты',
  rhomboids: 'ромбовидные',
  'rotator cuff': 'вращательная манжета',
  shins: 'передняя большеберцовая',
  shoulders: 'плечи',
  soleus: 'камбаловидная',
  sternocleidomastoid: 'шея',
  trapezius: 'трапеции',
  traps: 'трапеции',
  triceps: 'трицепс',
  'upper back': 'верх спины',
  'upper chest': 'верх груди',
  'wrist extensors': 'разгибатели кисти',
  'wrist flexors': 'сгибатели кисти',
  wrists: 'запястья',
};

const EQUIP_RU = {
  'body weight': 'Своё тело',
  cable: 'Блок',
  'leverage machine': 'Тренажёр',
  barbell: 'Штанга',
  dumbbell: 'Гантели',
  'ez barbell': 'EZ-гриф',
  'smith machine': 'Смит',
  kettlebell: 'Гиря',
  assisted: 'С поддержкой',
  weighted: 'С отягощением',
  'olympic barbell': 'Олимпийская штанга',
  'trap bar': 'Трэп-гриф',
  band: 'Резина',
  'resistance band': 'Резина',
  rope: 'Канат',
  'medicine ball': 'Медбол',
  'stability ball': 'Фитбол',
  'bosu ball': 'Босу',
  roller: 'Ролик',
  'wheel roller': 'Колесо для пресса',
  'sled machine': 'Сани',
  'stationary bike': 'Велотренажёр',
  'elliptical machine': 'Эллипс',
  'stepmill machine': 'Степпер',
  'skierg machine': 'Скиерг',
  'upper body ergometer': 'Ручной эргометр',
  hammer: 'Кувалда',
  tire: 'Покрышка',
};

const BODY_PART_RU = {
  waist: 'Пресс',
  'upper legs': 'Ноги',
  back: 'Спина',
  'lower legs': 'Голень',
  chest: 'Грудь',
  'upper arms': 'Руки',
  cardio: 'Кардио',
  shoulders: 'Плечи',
  'lower arms': 'Предплечья',
  neck: 'Шея',
};

// Compound lifts get bigger jumps in the progression model.
const COMPOUND_RE =
  /\b(squat|deadlift|bench|press|row|pull-?up|chin-?up|dip|clean|snatch|lunge|thrust|pulldown|push-?up|hack|leg press)\b/i;

// ---- name translation ----

const loadCache = () => (existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {});

function extractJson(text) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const t = (fence ? fence[1] : text).trim();
  const s = t.indexOf('{');
  const e = t.lastIndexOf('}');
  if (s === -1 || e === -1) throw new Error('no json');
  return JSON.parse(t.slice(s, e + 1));
}

async function translate(names) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'Ты переводишь названия силовых упражнений на русский так, как их называют в зале. ' +
            'Короткие устоявшиеся названия, без пояснений. Отвечай СТРОГО JSON-объектом вида {"english":"русское"}.',
        },
        { role: 'user', content: JSON.stringify(names) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const json = await res.json();
  return extractJson(json.choices[0].message.content);
}

// ---- build ----

const src = JSON.parse(readFileSync(SRC, 'utf8'));
const cache = loadCache();

const pending = [...new Set(src.map((e) => e.name))].filter((n) => !cache[n]);
if (KEY && pending.length) {
  console.log(`переводим ${pending.length} названий батчами по ${BATCH}…`);
  for (let i = 0; i < pending.length; i += BATCH) {
    const chunk = pending.slice(i, i + BATCH);
    try {
      Object.assign(cache, await translate(chunk));
      writeFileSync(CACHE, JSON.stringify(cache, null, 2), 'utf8');
      console.log(`  ${Math.min(i + BATCH, pending.length)}/${pending.length}`);
    } catch (err) {
      console.warn(`  батч ${i} упал: ${err.message}`);
    }
  }
} else if (!KEY) {
  console.log('OPENROUTER_API_KEY не задан — названия останутся английскими');
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const out = src.map((e) => ({
  id: e.id,
  name: e.name,
  nameRu: cache[e.name] || cap(e.name),
  muscle: e.target,
  muscleRu: TARGET_RU[e.target] ?? cap(e.target),
  secondaryRu: [...new Set((e.secondary || []).map((s) => SECONDARY_RU[s] ?? s))],
  equipment: e.equipment,
  equipmentRu: EQUIP_RU[e.equipment] ?? cap(e.equipment),
  bodyPart: e.bodyPart,
  bodyPartRu: BODY_PART_RU[e.bodyPart] ?? cap(e.bodyPart),
  compound: COMPOUND_RE.test(e.name),
}));

writeFileSync(OUT, JSON.stringify(out), 'utf8');

const entries = out.map((e) => `  '${e.id}': require('@/assets/gifs/${e.id}.gif'),`).join('\n');
const thumbs = out.map((e) => `  '${e.id}': require('@/assets/thumbs/${e.id}.jpg'),`).join('\n');
writeFileSync(
  GIF_MAP,
  '// GENERATED by scripts/build-catalog.mjs — do not edit.\n' +
    '// Metro needs static require() calls, so every asset is listed explicitly.\n\n' +
    `export const GIFS: Record<string, number> = {\n${entries}\n};\n\n` +
    `export const THUMBS: Record<string, number> = {\n${thumbs}\n};\n`,
  'utf8',
);

const translated = out.filter((e) => cache[e.name]).length;
console.log(`готово: ${out.length} упражнений, переведено ${translated}, английских ${out.length - translated}`);
