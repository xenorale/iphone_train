import type { BodyMetricRow } from '@/lib/types';
import { uid } from '@/lib/uid';
import { db } from './index';

export type Measurements = {
  waist?: number;
  chest?: number;
  arm?: number;
  thigh?: number;
  hip?: number;
};

export type Metric = {
  id: string;
  date: string;
  bodyweight: number | null;
  measurements: Measurements;
  note: string | null;
  createdAt: number;
};

function parse(row: BodyMetricRow): Metric {
  let measurements: Measurements = {};
  if (row.measurements) {
    try {
      measurements = JSON.parse(row.measurements);
    } catch {
      // ignore malformed
    }
  }
  return {
    id: row.id,
    date: row.date,
    bodyweight: row.bodyweight,
    measurements,
    note: row.note,
    createdAt: row.created_at,
  };
}

export function addMetric(params: {
  date: string;
  bodyweight: number | null;
  measurements?: Measurements;
  note?: string | null;
}): string {
  const id = uid('bm_');
  db.runSync(
    'INSERT INTO body_metrics (id, date, bodyweight, measurements, photo_uri, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      params.date,
      params.bodyweight,
      params.measurements && Object.keys(params.measurements).length
        ? JSON.stringify(params.measurements)
        : null,
      null,
      params.note ?? null,
      Date.now(),
    ],
  );
  return id;
}

export function deleteMetric(id: string) {
  db.runSync('DELETE FROM body_metrics WHERE id = ?', [id]);
}

export function allMetrics(): Metric[] {
  return db
    .getAllSync<BodyMetricRow>('SELECT * FROM body_metrics ORDER BY date DESC, created_at DESC')
    .map(parse);
}

export function latestMetric(): Metric | null {
  const row = db.getFirstSync<BodyMetricRow>(
    'SELECT * FROM body_metrics ORDER BY date DESC, created_at DESC LIMIT 1',
  );
  return row ? parse(row) : null;
}

/** Ascending bodyweight series for charting. */
export function weightSeries(): { date: string; weight: number }[] {
  return db
    .getAllSync<{ date: string; weight: number }>(
      'SELECT date, bodyweight as weight FROM body_metrics WHERE bodyweight IS NOT NULL ORDER BY date ASC, created_at ASC',
    )
    .filter((r) => r.weight != null);
}
