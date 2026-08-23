import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { exerciseDayLogs } from '@/lib/db/sessions';
import { PressableScale, Txt } from './ui';

function formatDay(ts: number) {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}`;
}

export type SetHistoryProps = {
  exerciseId: string;
  limit?: number;
  emptyHint?: string;
  /** Tapping a set copies it into the current input row. */
  onPickSet?: (weight: number | null, reps: number | null) => void;
};

/** "Что я делал в прошлый раз" — completed sets grouped by date, newest first. */
export function SetHistory({ exerciseId, limit = 6, emptyHint, onPickSet }: SetHistoryProps) {
  const theme = useTheme();
  const logs = useMemo(() => exerciseDayLogs(exerciseId, limit), [exerciseId, limit]);

  if (!logs.length) {
    return emptyHint ? (
      <Txt variant="caption" color="textTertiary">
        {emptyHint}
      </Txt>
    ) : null;
  }

  return (
    <View style={{ gap: Spacing.two }}>
      {logs.map((log) => (
        <View key={log.startedAt} style={styles.row}>
          <Txt variant="label" color="textTertiary" rounded style={styles.date}>
            {formatDay(log.startedAt)}
          </Txt>
          <View style={styles.sets}>
            {log.sets.map((s, i) => (
              <PressableScale
                key={i}
                disabled={!onPickSet}
                haptic={!!onPickSet}
                pressedScale={0.92}
                onPress={() => onPickSet?.(s.weight, s.reps)}
                style={[styles.pill, { backgroundColor: theme.backgroundElevated }]}>
                <Txt variant="caption" color="textSecondary" rounded>
                  {s.weight ?? '—'}×{s.reps ?? '—'}
                </Txt>
              </PressableScale>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  date: { width: 42 },
  sets: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  pill: { paddingHorizontal: Spacing.two, paddingVertical: 3, borderRadius: Radius.sm },
});
