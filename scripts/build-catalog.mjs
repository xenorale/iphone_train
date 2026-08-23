// Builds the curated, Russian-localized exercise catalog from the public-domain
// free-exercise-db dataset. Output: assets/data/exercises.json (bundled).
//
// Run: node scripts/build-catalog.mjs
// Source: https://github.com/yuhonas/free-exercise-db (Unlicense / public domain)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../assets/data/exercises.json');
const LOCAL = 'D:/tmp/fed.json';
const URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

const MUSCLE_RU = {
  chest: 'Грудь',
  'middle back': 'Спина',
  lats: 'Широчайшие',
  'lower back': 'Поясница',
  traps: 'Трапеции',
  neck: 'Шея',
  shoulders: 'Плечи',
  biceps: 'Бицепс',
  triceps: 'Трицепс',
  forearms: 'Предплечья',
  quadriceps: 'Квадрицепс',
  hamstrings: 'Бицепс бедра',
  glutes: 'Ягодицы',
  calves: 'Икры',
  abdominals: 'Пресс',
  adductors: 'Приводящие',
  abductors: 'Отводящие',
};

const EQUIP_RU = {
  barbell: 'Штанга',
  dumbbell: 'Гантели',
  cable: 'Блок',
  machine: 'Тренажёр',
  'body only': 'Своё тело',
  kettlebells: 'Гири',
  bands: 'Резина',
  'e-z curl bar': 'EZ-гриф',
  'exercise ball': 'Фитбол',
  'medicine ball': 'Мяч',
  'foam roll': 'Ролик',
  other: 'Прочее',
  none: 'Без инвентаря',
};

const LEVEL_RU = { beginner: 'Новичок', intermediate: 'Средний', expert: 'Продвинутый' };

// Curated staples: match = case-insensitive substring of the English name.
const CURATED = [
  // — Грудь —
  { match: 'Barbell Bench Press - Medium Grip', ru: 'Жим штанги лёжа', cues: ['Лопатки сведены и прижаты к скамье', 'Опускай гриф к середине груди', 'Локти под ~45°, не разводи в стороны'] },
  { match: 'Barbell Incline Bench Press - Medium Grip', ru: 'Жим штанги на наклонной', cues: ['Угол скамьи 30–45°', 'Гриф опускай к верху груди', 'Не отрывай таз от скамьи'] },
  { match: 'Dumbbell Bench Press', ru: 'Жим гантелей лёжа', cues: ['Гантели над грудью, кисти нейтрально', 'Опускай до лёгкого растяжения груди', 'Сводя вверху, чуть доворачивай'] },
  { match: 'Dumbbell Flyes', ru: 'Разводка гантелей лёжа', cues: ['Лёгкий сгиб в локтях фиксируй', 'Разводи по дуге до растяжения', 'Своди грудью, не руками'] },
  { match: 'Pushups', ru: 'Отжимания от пола', cues: ['Тело прямой линией, пресс в тонусе', 'Локти под ~45°', 'Грудью почти до пола'] },
  // — Спина —
  { match: 'Barbell Deadlift', ru: 'Становая тяга', cues: ['Спина прямая, грудь раскрыта', 'Гриф ведёшь вдоль ног', 'Толкай пол ногами, таз и плечи синхронно'] },
  { match: 'Bent Over Barbell Row', ru: 'Тяга штанги в наклоне', cues: ['Наклон ~45°, спина прямая', 'Тяни к низу живота', 'Своди лопатки в верхней точке'] },
  { match: 'Wide-Grip Lat Pulldown', ru: 'Тяга верхнего блока широким хватом', cues: ['Грудь вверх, лёгкий прогиб', 'Тяни к верху груди локтями', 'Контролируй возврат'] },
  { match: 'Seated Cable Rows', ru: 'Тяга нижнего блока к поясу', cues: ['Спина прямая, не раскачивайся', 'Тяни к животу, локти вдоль тела', 'Своди лопатки'] },
  { match: 'Pullups', ru: 'Подтягивания', cues: ['Хват чуть шире плеч', 'Тяни грудь к перекладине', 'Полное опускание внизу'] },
  // — Плечи —
  { match: 'Dumbbell Shoulder Press', ru: 'Жим гантелей сидя', cues: ['Спина прижата к спинке', 'Жми по дуге над головой', 'Не блокируй локти жёстко'] },
  { match: 'Standing Military Press', ru: 'Армейский жим стоя', cues: ['Корпус напряжён, без раскачки', 'Гриф над макушкой', 'Голову чуть назад, пропуская гриф'] },
  { match: 'Side Lateral Raise', ru: 'Махи гантелями в стороны', cues: ['Лёгкий сгиб локтей', 'Поднимай до уровня плеч', 'Веди локтями, не кистями'] },
  { match: 'Face Pull', ru: 'Тяга к лицу', cues: ['Канат к лицу, локти высоко', 'Разводи в стороны у лица', 'Своди задние дельты'] },
  // — Ноги —
  { match: 'Barbell Full Squat', ru: 'Приседания со штангой', cues: ['Гриф на трапециях, корпус плотный', 'Колени по направлению носков', 'Таз до параллели или ниже'] },
  { match: 'Front Barbell Squat', ru: 'Фронтальные приседания', cues: ['Локти высоко, гриф на дельтах', 'Корпус вертикально', 'Колени вперёд, пятки на полу'] },
  { match: 'Leg Press', ru: 'Жим ногами', cues: ['Стопы на ширине таза', 'Опускай до ~90° в коленях', 'Не отрывай таз от спинки'] },
  { match: 'Romanian Deadlift', ru: 'Румынская тяга', cues: ['Колени чуть согнуты, фиксированы', 'Таз назад, гриф вдоль ног', 'Чувствуй растяжение бицепса бедра'] },
  { match: 'Barbell Lunge', ru: 'Выпады со штангой', cues: ['Шаг достаточно длинный', 'Колено задней ноги к полу', 'Толчок передней пяткой'] },
  { match: 'Leg Extensions', ru: 'Разгибания ног сидя', cues: ['Валик над стопой', 'Разгибай плавно, пауза вверху', 'Без рывков'] },
  { match: 'Lying Leg Curls', ru: 'Сгибания ног лёжа', cues: ['Таз прижат к скамье', 'Сгибай пятками к ягодицам', 'Контролируй возврат'] },
  { match: 'Standing Calf Raises', ru: 'Подъёмы на носки стоя', cues: ['Полная амплитуда: вниз–вверх', 'Пауза в верхней точке', 'Без подпрыгиваний'] },
  { match: 'Barbell Hip Thrust', ru: 'Ягодичный мост со штангой', cues: ['Лопатки на скамье', 'Толкай тазом вверх ягодицами', 'Вверху корпус параллельно полу'] },
  // — Руки —
  { match: 'Barbell Curl', ru: 'Подъём штанги на бицепс', cues: ['Локти прижаты к корпусу', 'Без раскачки спиной', 'Полное опускание внизу'] },
  { match: 'Dumbbell Bicep Curl', ru: 'Подъём гантелей на бицепс', cues: ['Локти зафиксированы', 'Доворачивай кисть вверх', 'Опускай медленно'] },
  { match: 'Hammer Curls', ru: 'Молотковые сгибания', cues: ['Кисти нейтрально весь подход', 'Локти у корпуса', 'Без рывков'] },
  { match: 'Triceps Pushdown', ru: 'Разгибание на блоке', cues: ['Локти прижаты к бокам', 'Разгибай полностью вниз', 'Возврат под контролем'] },
  { match: 'Dips - Triceps Version', ru: 'Отжимания на брусьях', cues: ['Корпус вертикально для трицепса', 'Опускайся до ~90°', 'Локти назад, не в стороны'] },
  { match: 'Lying Triceps Press', ru: 'Французский жим лёжа', cues: ['Локти направлены вверх', 'Опускай ко лбу/за голову', 'Двигается только предплечье'] },
  // — Пресс / кор —
  { match: 'Plank', ru: 'Планка', cues: ['Тело прямой линией', 'Пресс и ягодицы в тонусе', 'Таз не проваливай'] },
  { match: 'Crunches', ru: 'Скручивания', cues: ['Поясница прижата к полу', 'Скручивай корпус, не шею', 'Выдох на подъёме'] },
  { match: 'Hanging Leg Raise', ru: 'Подъём ног в висе', cues: ['Без раскачки', 'Поднимай таз, скручивая пресс', 'Опускай ноги медленно'] },
  { match: 'Cable Crunch', ru: 'Скручивания на блоке', cues: ['Скругляй спину прессом', 'Таз неподвижен', 'Тяни корпусом, не руками'] },
  { match: 'Russian Twist', ru: 'Русские скручивания', cues: ['Спина прямая, корпус назад', 'Поворачивай корпусом', 'Контролируй темп'] },
  // — Гантели / свободные —
  { match: 'Arnold', ru: 'Жим Арнольда', cues: ['Старт ладонями к себе', 'Разворачивай кисти при жиме', 'Плавно вверх и вниз'] },
  { match: 'Goblet Squat', ru: 'Приседания гоблет', cues: ['Гантель у груди', 'Корпус вертикально', 'Локти между коленей внизу'] },
  // — Кардио —
  { match: 'Running, Treadmill', ru: 'Бег на дорожке', cues: ['Корпус прямой, взгляд вперёд', 'Приземляйся под центр тяжести', 'Дыши ровно, держи темп'] },
  { match: 'Bicycling, Stationary', ru: 'Велотренажёр', cues: ['Колено слегка согнуто внизу', 'Спина ровная, не заваливайся', 'Держи равномерный каданс'] },
  { match: 'Rowing, Stationary', ru: 'Гребной тренажёр', cues: ['Толчок ногами → корпус → руки', 'Спина прямая', 'Возврат в обратном порядке'] },
  { match: 'Elliptical Trainer', ru: 'Эллипс', cues: ['Корпус вертикально', 'Работай руками и ногами', 'Стопу не отрывай от педали'] },
  { match: 'Rope Jumping', ru: 'Скакалка', cues: ['Прыжки невысокие, на носках', 'Вращай кистями, не плечами', 'Локти у корпуса'] },
  { match: 'Stairmaster', ru: 'Степпер', cues: ['Не виси на поручнях', 'Полный шаг, корпус прямой', 'Наступай на всю стопу'] },
];

function pick(data, match) {
  const lc = match.toLowerCase();
  const exact = data.find((x) => x.name.toLowerCase() === lc && x.images?.length);
  if (exact) return exact;
  return data.find((x) => x.name.toLowerCase().includes(lc) && x.images?.length);
}

function slug(id) {
  return id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function loadData() {
  if (existsSync(LOCAL)) return JSON.parse(readFileSync(LOCAL, 'utf8'));
  const res = await fetch(URL);
  return res.json();
}

const data = await loadData();
const out = [];
const missing = [];

for (const item of CURATED) {
  const src = pick(data, item.match);
  if (!src) {
    missing.push(item.match);
    continue;
  }
  const isCardio = src.category === 'cardio';
  out.push({
    id: slug(src.id),
    name: src.name,
    nameRu: item.ru,
    muscle: isCardio ? 'cardio' : (src.primaryMuscles[0] ?? 'other'),
    muscleRu: isCardio ? 'Кардио' : (MUSCLE_RU[src.primaryMuscles[0]] ?? src.primaryMuscles[0] ?? 'Другое'),
    secondaryRu: (src.secondaryMuscles ?? []).map((m) => MUSCLE_RU[m] ?? m),
    equipment: src.equipment ?? 'other',
    equipmentRu: EQUIP_RU[src.equipment] ?? src.equipment ?? 'Прочее',
    level: src.level ?? 'beginner',
    levelRu: LEVEL_RU[src.level] ?? 'Новичок',
    mechanic: src.mechanic ?? null,
    category: src.category ?? 'strength',
    cues: item.cues,
    instructionsEn: src.instructions ?? [],
    images: (src.images ?? []).map((p) => IMG_BASE + p),
  });
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`Wrote ${out.length} exercises -> ${OUT}`);
if (missing.length) console.log('UNMATCHED:', missing);
