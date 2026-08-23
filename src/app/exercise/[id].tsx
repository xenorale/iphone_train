import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, RotateCw, Sparkles } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseGif } from '@/components/exercise-gif';
import { LineChart } from '@/components/line-chart';
import { MarkdownLite } from '@/components/markdown-lite';
import { Button, Card, IconButton, PressableScale, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApiKey } from '@/lib/ai/key';
import { AiError } from '@/lib/ai/openrouter';
import { explainTechnique } from '@/lib/ai/technique';
import { getExercise } from '@/lib/catalog';
import { exerciseHistory } from '@/lib/db/sessions';
import { getTechnique, saveTechnique } from '@/lib/db/technique';
import { useSettings } from '@/lib/store/settings';

export default function ExerciseDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = getExercise(id);

  const hasKey = useApiKey((s) => s.hasKey);
  const aiModel = useSettings((s) => s.aiModel);

  const [technique, setTechnique] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const history = useMemo(() => (exercise ? exerciseHistory(exercise.id) : []), [exercise]);

  useEffect(() => {
    if (!exercise) return;
    const cached = getTechnique(exercise.id);
    if (cached) setTechnique(cached.content);
  }, [exercise]);

  if (!exercise) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <Txt variant="body" color="textSecondary">
            Упражнение не найдено
          </Txt>
        </View>
      </SafeAreaView>
    );
  }

  const onGenerate = async () => {
    setError(null);
    setLoading(true);
    try {
      const content = await explainTechnique(exercise, aiModel);
      saveTechnique(exercise.id, content, aiModel);
      setTechnique(content);
    } catch (e) {
      setError(e instanceof AiError ? e.human : 'Не удалось сгенерировать разбор.');
    } finally {
      setLoading(false);
    }
  };

  const meta = [exercise.muscleRu, exercise.equipmentRu, exercise.levelRu].filter(Boolean);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <IconButton onPress={() => router.back()}>
            <ChevronLeft size={22} color={theme.text} />
          </IconButton>
        </View>

        <ExerciseGif images={exercise.images} height={280} />

        <View style={{ gap: Spacing.one }}>
          <Txt variant="title">{exercise.nameRu}</Txt>
        </View>

        <View style={styles.tags}>
          {meta.map((m) => (
            <View key={m} style={[styles.tag, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <Txt variant="caption" color="textSecondary">
                {m}
              </Txt>
            </View>
          ))}
        </View>

        {exercise.secondaryRu.length ? (
          <Txt variant="caption" color="textTertiary">
            Дополнительно: {exercise.secondaryRu.join(', ')}
          </Txt>
        ) : null}

        {exercise.cues.length ? (
        <Card variant="surface" padding="five">
          <Txt variant="micro" color="accent">
            Ключевые моменты
          </Txt>
          <View style={{ gap: Spacing.three, marginTop: Spacing.three }}>
            {exercise.cues.map((cue, i) => (
              <View key={i} style={styles.cueRow}>
                <View style={[styles.bullet, { backgroundColor: theme.accent }]}>
                  <Txt variant="micro" color="accentOn">
                    {i + 1}
                  </Txt>
                </View>
                <Txt variant="body" style={styles.cueText}>
                  {cue}
                </Txt>
              </View>
            ))}
          </View>
        </Card>
        ) : null}

        {/* Strength progress */}
        {history.length >= 2 ? (
          <Card variant="surface" padding="five">
            <View style={styles.aiHead}>
              <Txt variant="micro" color="accent">
                Прогресс силы
              </Txt>
              <Txt variant="label" color="textSecondary" rounded>
                {history[history.length - 1].est1rm} кг · 1ПМ
              </Txt>
            </View>
            <View style={{ marginTop: Spacing.three }}>
              <LineChart values={history.map((h) => h.est1rm)} />
            </View>
            <Txt variant="caption" color="textTertiary" style={{ marginTop: Spacing.two }}>
              Оценка одноповторного максимума по лучшим подходам
            </Txt>
          </Card>
        ) : null}

        {/* AI technique */}
        <Card variant="surface" padding="five">
          <View style={styles.aiHead}>
            <View style={styles.rowIcon}>
              <Sparkles size={16} color={theme.accent} />
              <Txt variant="micro" color="accent">
                Разбор техники от ИИ
              </Txt>
            </View>
            {technique ? (
              <PressableScale onPress={onGenerate} disabled={loading} haptic={false}>
                <RotateCw size={16} color={theme.textTertiary} />
              </PressableScale>
            ) : null}
          </View>

          {loading ? (
            <View style={{ paddingVertical: Spacing.five, alignItems: 'center' }}>
              <ActivityIndicator color={theme.accent} />
              <Txt variant="caption" color="textTertiary" style={{ marginTop: Spacing.two }}>
                Генерирую разбор…
              </Txt>
            </View>
          ) : technique ? (
            <View style={{ marginTop: Spacing.three }}>
              <MarkdownLite text={technique} />
            </View>
          ) : (
            <View style={{ marginTop: Spacing.three, gap: Spacing.three }}>
              <Txt variant="body" color="textSecondary">
                {hasKey
                  ? 'Подробный разбор: исходное положение, выполнение, частые ошибки и дыхание.'
                  : 'Добавь ключ OpenRouter в разделе «Ещё», чтобы получить разбор от ИИ.'}
              </Txt>
              {hasKey ? (
                <Button
                  title="Сгенерировать разбор"
                  icon={<Sparkles size={16} color={theme.accentOn} />}
                  onPress={onGenerate}
                />
              ) : (
                <Button title="Открыть настройки" variant="secondary" onPress={() => router.push('/settings')} />
              )}
            </View>
          )}

          {error ? (
            <Txt variant="caption" color="danger" style={{ marginTop: Spacing.three }}>
              {error}
            </Txt>
          ) : null}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: Spacing.five, paddingBottom: Spacing.ten, gap: Spacing.four },
  topRow: { paddingTop: Spacing.two },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tag: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  bullet: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  cueText: { flex: 1 },
  aiHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowIcon: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
