import { db } from './index';

type Row = { content: string; model: string | null; created_at: number };

export function getTechnique(exerciseId: string): Row | null {
  return db.getFirstSync<Row>(
    'SELECT content, model, created_at FROM technique_cache WHERE exercise_id = ?',
    [exerciseId],
  );
}

export function saveTechnique(exerciseId: string, content: string, model: string) {
  db.runSync(
    `INSERT INTO technique_cache (exercise_id, content, model, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(exercise_id) DO UPDATE SET content = excluded.content, model = excluded.model, created_at = excluded.created_at`,
    [exerciseId, content, model, Date.now()],
  );
}
