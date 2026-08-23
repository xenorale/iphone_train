import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseGif } from '@/components/exercise-gif';
import { LineChart } from '@/components/line-chart';
import { MuscleMap } from '@/components/muscle-map';
import { SetHistory } from '@/components/set-history';
import { Card, IconButton, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getExercise } from '@/lib/catalog';
import { exerciseHistory } from '@/lib/db/sessions';

export default function ExerciseDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = getExercise(id);

  const history = useMemo(() => (exercise ? exerciseHistory(exercise.id) : []), [exercise]);

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

  const meta = [exercise.muscleRu, exercise.equipmentRu, exercise.compound ? 'Базовое' : 'Изолирующее'];

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <IconButton onPress={() => router.back()}>
            <ChevronLeft size={22} color={theme.text} />
          </IconButton>
        </View>

        <ExerciseGif exerciseId={exercise.id} height={280} />

        <Txt variant="title">{exercise.nameRu}</Txt>

        <View style={styles.tags}>
          {meta.map((m) => (
            <View key={m} style={[styles.tag, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <Txt variant="caption" color="textSecondary">
                {m}
              </Txt>
            </View>
          ))}
        </View>

        <Card variant="surface" padding="five">
          <Txt variant="micro" color="accent">
            Рабочие мышцы
          </Txt>
          <View style={{ marginTop: Spacing.four }}>
            <MuscleMap target={exercise.muscle} secondary={exercise.secondaryRu} height={170} />
          </View>
          {exercise.secondaryRu.length ? (
            <Txt variant="caption" color="textTertiary" center style={{ marginTop: Spacing.three }}>
              Дополнительно: {exercise.secondaryRu.join(', ')}
            </Txt>
          ) : null}
        </Card>

        {history.length >= 2 ? (
          <Card variant="surface" padding="five">
            <View style={styles.head}>
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

        <Card variant="surface" padding="five">
          <Txt variant="micro" color="accent">
            История подходов
          </Txt>
          <View style={{ marginTop: Spacing.three }}>
            <SetHistory exerciseId={exercise.id} limit={12} emptyHint="Ещё не делал это упражнение" />
          </View>
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
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
