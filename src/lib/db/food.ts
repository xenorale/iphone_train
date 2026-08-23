import { uid } from '@/lib/uid';
import { db } from './index';

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_LABELS: Record<Meal, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
};

export type FoodEntry = {
  id: string;
  date: string;
  meal: Meal;
  text: string;
  kcal: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  createdAt: number;
};

export type Macros = { kcal: number; protein: number; fat: number; carbs: number };

export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

export function addFood(params: {
  date: string;
  meal: Meal;
  text: string;
  macros?: Macros | null;
}): string {
  const id = uid('food_');
  db.runSync(
    `INSERT INTO food_log (id, date, meal, text, kcal, protein, fat, carbs, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      params.date,
      params.meal,
      params.text,
      params.macros?.kcal ?? null,
      params.macros?.protein ?? null,
      params.macros?.fat ?? null,
      params.macros?.carbs ?? null,
      Date.now(),
    ],
  );
  return id;
}

export function updateFoodMacros(id: string, macros: Macros) {
  db.runSync('UPDATE food_log SET kcal = ?, protein = ?, fat = ?, carbs = ? WHERE id = ?', [
    macros.kcal,
    macros.protein,
    macros.fat,
    macros.carbs,
    id,
  ]);
}

export function deleteFood(id: string) {
  db.runSync('DELETE FROM food_log WHERE id = ?', [id]);
}

export function foodForDate(date: string): FoodEntry[] {
  return db
    .getAllSync<{
      id: string;
      date: string;
      meal: string;
      text: string;
      kcal: number | null;
      protein: number | null;
      fat: number | null;
      carbs: number | null;
      created_at: number;
    }>('SELECT * FROM food_log WHERE date = ? ORDER BY created_at ASC', [date])
    .map((r) => ({ ...r, meal: r.meal as Meal, createdAt: r.created_at }));
}

export function totalsForDate(date: string): Macros {
  const r = db.getFirstSync<{ kcal: number | null; protein: number | null; fat: number | null; carbs: number | null }>(
    `SELECT SUM(kcal) as kcal, SUM(protein) as protein, SUM(fat) as fat, SUM(carbs) as carbs
       FROM food_log WHERE date = ?`,
    [date],
  );
  return {
    kcal: Math.round(r?.kcal ?? 0),
    protein: Math.round(r?.protein ?? 0),
    fat: Math.round(r?.fat ?? 0),
    carbs: Math.round(r?.carbs ?? 0),
  };
}
