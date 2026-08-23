import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Clock, Dumbbell, Sparkles, Weight } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MarkdownLite } from '@/components/markdown-lite';
import { Button, Card, Divider, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApiKey } from '@/lib/ai/key';
import { AiError } from '@/lib/ai/openrouter';
import { reviewWorkout } from '@/lib/ai/review';
import {
  getSessionReview,
  previousSessionFor,
  saveSessionReview,
  sessionDetail,
} from '@/lib/db/sessions';

export default function WorkoutSummaryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const hasKey = useApiKey((s) => s.hasKey);

  const session = useMemo(() => sessionDetail(id), [id]);
  const [review, setReview] = useState<string | null>(() => getSessionReview(id));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || review || !hasKey || loading) return;
    let cancelled = false;
    setLoading(true);
    const previous = previousSessionFor(session.programDayId, session.startedAt);
    reviewWorkout(session, previous)
      .then((content) => {
        if (cancelled) return;
        saveSessionReview(session.id, content);
        setReview(content);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof AiError ? e.human : 'Не удалось получить разбор.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, hasKey]);

  if (!session) {
    return (
      <SafeAreaView style={[styles.flex, styles.center, { backgroundColor: theme.background }]}>
        <Txt variant="body" color="textSecondary">
          Тренировка не найдена
        </Txt>
        <Button
          title="На главную"
          variant="secondary"
          fullWidth={false}
          onPress={() => router.replace('/')}
          style={{ marginTop: Spacing.four }}
        />
      </SafeAreaView>
    );
  }

  const minutes = session.finishedAt
    ? Math.max(1, Math.round((session.finishedAt - session.startedAt) / 60000))
    : 0;
  const totalSets = session.exercises.reduce((n, e) => n + e.sets.length, 0);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={[styles.badge, { backgroundColor: theme.successMuted }]}>
            <Check size={26} color={theme.success} strokeWidth={3} />
          </View>
          <Txt variant="title" center>
            Тренировка засчитана
          </Txt>
          <Txt variant="body" color="textSecondary" center>
            {session.title}
          </Txt>
        </View>

        <View style={styles.statsRow}>
          <Card style={styles.stat}>
            <Clock size={16} color={theme.accent} />
            <Txt variant="subtitle" rounded style={{ marginTop: Spacing.one }}>
              {minutes}
            </Txt>
            <Txt variant="caption" color="textSecondary">
              минут
            </Txt>
          </Card>
          <Card style={styles.stat}>
            <Dumbbell size={16} color={theme.accent} />
            <Txt variant="subtitle" rounded style={{ marginTop: Spacing.one }}>
              {totalSets}
            </Txt>
            <Txt variant="caption" color="textSecondary">
              подходов
            </Txt>
          </Card>
          <Card style={styles.stat}>
            <Weight size={16} color={theme.accent} />
            <Txt variant="subtitle" rounded style={{ marginTop: Spacing.one }}>
              {(session.volume / 1000).toFixed(1)}т
            </Txt>
            <Txt variant="caption" color="textSecondary">
              объём
            </Txt>
          </Card>
        </View>

        <Card padding="five">
          <Txt variant="micro" color="accent">
            Что сделал
          </Txt>
          <View style={{ marginTop: Spacing.three }}>
            {session.exercises.map((ex, i) => (
              <View key={ex.exerciseId}>
                {i > 0 ? <Divider /> : null}
                <View style={styles.exRow}>
                  <Txt variant="body" style={{ flex: 1 }} numberOfLines={2}>
                    {ex.nameRu}
                  </Txt>
                  <Txt variant="caption" color="textSecondary" rounded>
                    {ex.sets.map((s) => `${s.weight ?? 0}×${s.reps ?? 0}`).join('  ')}
                  </Txt>
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Card variant="surface" padding="five">
          <View style={styles.rowIcon}>
            <Sparkles size={16} color={theme.accent} />
            <Txt variant="micro" color="accent">
              Разбор тренера
            </Txt>
          </View>

          {loading ? (
            <View style={{ paddingVertical: Spacing.five, alignItems: 'center' }}>
              <ActivityIndicator color={theme.accent} />
              <Txt variant="caption" color="textTertiary" style={{ marginTop: Spacing.two }}>
                Разбираю тренировку…
              </Txt>
            </View>
          ) : review ? (
            <View style={{ marginTop: Spacing.three }}>
              <MarkdownLite text={review} />
            </View>
          ) : (
            <Txt variant="body" color="textSecondary" style={{ marginTop: Spacing.three }}>
              {hasKey
                ? 'Разбор не готов — можно вернуться к нему позже из истории.'
                : 'Добавь ключ OpenRouter в разделе «Ещё», чтобы получать разбор после тренировки.'}
            </Txt>
          )}

          {error ? (
            <Txt variant="caption" color="danger" style={{ marginTop: Spacing.three }}>
              {error}
            </Txt>
          ) : null}
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Готово" onPress={() => router.replace('/')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.five, gap: Spacing.four, paddingBottom: Spacing.eight },
  hero: { alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.four },
  badge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two },
  statsRow: { flexDirection: 'row', gap: Spacing.three },
  stat: { flex: 1, alignItems: 'center', gap: 0 },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  rowIcon: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  footer: { paddingHorizontal: Spacing.five, paddingBottom: Spacing.three, paddingTop: Spacing.two },
});
