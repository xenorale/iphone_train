import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronRight, Flame } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Card, PressableScale, ProgressBar, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getExercise } from '@/lib/catalog';
import { trainingDays, volumeByExercise } from '@/lib/db/sessions';

const DAY = 86_400_000;

/** Sets per muscle over the last month — shows what's actually getting trained. */
function muscleBreakdown(since: number) {
  const rows = volumeByExercise(since);
  const byMuscle = new Map<string, number>();
  for (const r of rows) {
    const muscle = getExercise(r.exerciseId)?.muscleRu ?? 'Прочее';
    byMuscle.set(muscle, (byMuscle.get(muscle) ?? 0) + r.sets);
  }
  return [...byMuscle.entries()]
    .map(([muscle, sets]) => ({ muscle, sets }))
    .sort((a, b) => b.sets - a.sets);
}

export function TrainingStats() {
  const theme = useTheme();
  const router = useRouter();

  const { data } = useQuery({
    queryKey: ['trainingStats'],
    queryFn: () => {
      const monthAgo = Date.now() - 30 * DAY;
      const days = trainingDays(monthAgo);
      const weekAgo = Date.now() - 7 * DAY;
      return {
        month: days.length,
        week: days.filter((d) => d >= weekAgo).length,
        muscles: muscleBreakdown(monthAgo),
        volume: volumeByExercise(monthAgo).reduce((n, r) => n + r.volume, 0),
      };
    },
  });

  if (!data) return null;
  const top = data.muscles.slice(0, 6);
  const max = top[0]?.sets ?? 1;

  return (
    <Card padding="five">
      <View style={styles.head}>
        <Txt variant="micro" color="accent">
          Тренировки за месяц
        </Txt>
        <PressableScale haptic={false} onPress={() => router.push('/history')} style={styles.link}>
          <Txt variant="micro" color="textTertiary">
            вся история
          </Txt>
          <ChevronRight size={14} color={theme.textTertiary} />
        </PressableScale>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Txt variant="display" rounded>
            {data.month}
          </Txt>
          <Txt variant="caption" color="textSecondary">
            тренировок
          </Txt>
        </View>
        <View style={styles.stat}>
          <Txt variant="display" rounded>
            {(data.volume / 1000).toFixed(0)}
          </Txt>
          <Txt variant="caption" color="textSecondary">
            тонн поднято
          </Txt>
        </View>
        <View style={styles.stat}>
          <View style={styles.flameRow}>
            <Flame size={18} color={data.week >= 3 ? theme.accent : theme.textTertiary} />
            <Txt variant="display" rounded>
              {data.week}
            </Txt>
          </View>
          <Txt variant="caption" color="textSecondary">
            за неделю
          </Txt>
        </View>
      </View>

      {top.length ? (
        <View style={{ marginTop: Spacing.five, gap: Spacing.three }}>
          <Txt variant="micro" color="textTertiary">
            Подходов по группам
          </Txt>
          {top.map((m) => (
            <View key={m.muscle} style={{ gap: 4 }}>
              <View style={styles.head}>
                <Txt variant="caption" color="textSecondary">
                  {m.muscle}
                </Txt>
                <Txt variant="caption" color="textTertiary" rounded>
                  {m.sets}
                </Txt>
              </View>
              <ProgressBar progress={m.sets / max} height={5} />
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  statsRow: { flexDirection: 'row', marginTop: Spacing.four },
  stat: { flex: 1, gap: 2 },
  flameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
});
