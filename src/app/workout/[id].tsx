import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Scale, Sparkles, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoachSheet } from '@/components/coach-sheet';
import { PlateCalculator } from '@/components/plate-calculator';
import { RestTimer } from '@/components/rest-timer';
import { Button, Card, IconButton, PressableScale, ProgressBar, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getExercise } from '@/lib/catalog';
import { getProgramDay } from '@/lib/db/programs';
import { finishSession, startSession, upsertSet } from '@/lib/db/sessions';
import { suggestNext, type Suggestion } from '@/lib/progression';
import type { ProgramExerciseRow } from '@/lib/types';

type SetEntry = { id?: string; weight: string; reps: string; done: boolean };

const num = (s: string): number | null => {
  const v = parseFloat(s.replace(',', '.'));
  return Number.isFinite(v) ? v : null;
};
const int = (s: string): number | null => {
  const v = parseInt(s, 10);
  return Number.isFinite(v) ? v : null;
};

export default function WorkoutScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const day = useMemo(() => getProgramDay(id), [id]);
  const suggestions = useMemo(() => {
    const m: Record<string, Suggestion> = {};
    if (day) {
      for (const pex of day.exercises) {
        m[pex.id] = suggestNext(pex.exercise_id, {
          sets: pex.sets,
          repMin: pex.rep_min ?? 8,
          repMax: pex.rep_max ?? 12,
        });
      }
    }
    return m;
  }, [day]);

  const [setsState, setSetsState] = useState<Record<string, SetEntry[]>>(() => {
    const map: Record<string, SetEntry[]> = {};
    if (day) {
      for (const pex of day.exercises) {
        const w =
          suggestNext(pex.exercise_id, {
            sets: pex.sets,
            repMin: pex.rep_min ?? 8,
            repMax: pex.rep_max ?? 12,
          }).weight ?? pex.start_weight;
        map[pex.id] = Array.from({ length: pex.sets }, () => ({
          weight: w != null ? String(w) : '',
          reps: '',
          done: false,
        }));
      }
    }
    return map;
  });

  const sessionRef = useRef<string | null>(null);
  const finishedRef = useRef(false);
  const [rest, setRest] = useState<{ key: number; seconds: number } | null>(null);
  const [plate, setPlate] = useState<number | null>(null);
  const [coachExercise, setCoachExercise] = useState<ProgramExerciseRow | null>(null);
  const [coachWorkout, setCoachWorkout] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!day) return;
    const sid = startSession(day.id, day.title);
    sessionRef.current = sid;
    return () => {
      if (!finishedRef.current) finishSession(sid);
    };
  }, [day]);

  if (!day) {
    return (
      <SafeAreaView style={[styles.flex, styles.center, { backgroundColor: theme.background }]}>
        <Txt variant="body" color="textSecondary">
          Тренировка не найдена
        </Txt>
        <Button title="Назад" variant="secondary" fullWidth={false} onPress={() => router.back()} style={{ marginTop: Spacing.four }} />
      </SafeAreaView>
    );
  }

  const patchSet = (pexId: string, idx: number, patch: Partial<SetEntry>) =>
    setSetsState((prev) => ({
      ...prev,
      [pexId]: prev[pexId].map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));

  const toggleDone = (pexId: string, idx: number) => {
    const pex = day.exercises.find((e) => e.id === pexId)!;
    const entry = setsState[pexId][idx];
    const done = !entry.done;
    const sid = sessionRef.current;
    if (sid) {
      const setId = upsertSet({
        id: entry.id,
        sessionId: sid,
        exerciseId: pex.exercise_id,
        nameRu: pex.name_ru,
        setIndex: idx,
        weight: num(entry.weight),
        reps: int(entry.reps),
        rpe: pex.target_rpe,
        completed: done,
      });
      patchSet(pexId, idx, { done, id: setId });
    } else {
      patchSet(pexId, idx, { done });
    }
    if (done && pex.rest_seconds) setRest({ key: Date.now(), seconds: pex.rest_seconds });
  };

  const completedCount = Object.values(setsState)
    .flat()
    .filter((s) => s.done).length;
  const totalCount = Object.values(setsState)
    .flat().length;
  const pct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const elapsed = Math.floor((now - startedAt) / 1000);
  const elapsedStr = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;

  const doFinish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (sessionRef.current) finishSession(sessionRef.current);
    queryClient.invalidateQueries();
    router.back();
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton onPress={doFinish} variant="ghost">
          <X size={22} color={theme.text} />
        </IconButton>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt variant="subtitle" numberOfLines={1}>
            {day.title}
          </Txt>
          <Txt variant="caption" color="textTertiary">
            {completedCount} из {totalCount} подходов · {elapsedStr}
          </Txt>
        </View>
        <IconButton size={44} variant="ghost" onPress={() => setCoachWorkout(true)}>
          <Sparkles size={20} color={theme.accent} />
        </IconButton>
      </View>

      <View style={styles.progressRow}>
        <View style={{ flex: 1 }}>
          <ProgressBar progress={totalCount ? completedCount / totalCount : 0} height={10} />
        </View>
        <Txt variant="label" color="accent" rounded>
          {pct}%
        </Txt>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {day.exercises.map((pex) => {
          const sets = setsState[pex.id] ?? [];
          const sug = suggestions[pex.id];
          const topWeight = num(sets[0]?.weight ?? '') ?? sug?.weight ?? 0;
          return (
            <Card key={pex.id} padding="four">
              <View style={styles.exHead}>
                <PressableScale haptic={false} onPress={() => setCoachExercise(pex)} style={{ flex: 1 }}>
                  <Txt variant="bodyStrong" numberOfLines={1}>
                    {pex.name_ru}
                  </Txt>
                  <Txt variant="caption" color="textSecondary">
                    {pex.sets} подхода × {pex.rep_min}–{pex.rep_max} повт · техника и ИИ
                  </Txt>
                </PressableScale>
                <IconButton size={38} onPress={() => setCoachExercise(pex)}>
                  <Sparkles size={16} color={theme.accent} />
                </IconButton>
                <IconButton size={38} onPress={() => setPlate(topWeight || 20)}>
                  <Scale size={16} color={theme.textSecondary} />
                </IconButton>
              </View>

              {sug?.reason ? (
                <View style={[styles.hint, { backgroundColor: theme.accentMuted }]}>
                  <Txt variant="caption" color="accent">
                    {sug.reason}
                  </Txt>
                </View>
              ) : null}

              {/* grid header */}
              <View style={styles.gridHead}>
                <Txt variant="micro" color="textTertiary" style={styles.colNum}>
                  Сет
                </Txt>
                <Txt variant="micro" color="textTertiary" style={styles.colInput}>
                  Вес
                </Txt>
                <Txt variant="micro" color="textTertiary" style={styles.colInput}>
                  Повт
                </Txt>
                <View style={styles.colCheck} />
              </View>

              {sets.map((s, i) => (
                <View key={i} style={styles.setRow}>
                  <Txt variant="label" color="textSecondary" style={styles.colNum}>
                    {i + 1}
                  </Txt>
                  <View style={styles.colInput}>
                    <TextInput
                      value={s.weight}
                      onChangeText={(t) => patchSet(pex.id, i, { weight: t })}
                      keyboardType="numeric"
                      placeholder="—"
                      placeholderTextColor={theme.textTertiary}
                      selectionColor={theme.accent}
                      style={[styles.input, { backgroundColor: theme.backgroundElevated, color: theme.text }]}
                    />
                  </View>
                  <View style={styles.colInput}>
                    <TextInput
                      value={s.reps}
                      onChangeText={(t) => patchSet(pex.id, i, { reps: t })}
                      keyboardType="numeric"
                      placeholder={String(pex.rep_min ?? '')}
                      placeholderTextColor={theme.textTertiary}
                      selectionColor={theme.accent}
                      style={[styles.input, { backgroundColor: theme.backgroundElevated, color: theme.text }]}
                    />
                  </View>
                  <View style={styles.colCheck}>
                    <PressableScale
                      onPress={() => toggleDone(pex.id, i)}
                      pressedScale={0.85}
                      style={[
                        styles.check,
                        {
                          backgroundColor: s.done ? theme.accent : 'transparent',
                          borderColor: s.done ? theme.accent : theme.border,
                        },
                      ]}>
                      <Check size={18} color={s.done ? theme.accentOn : theme.textTertiary} strokeWidth={3} />
                    </PressableScale>
                  </View>
                </View>
              ))}
            </Card>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        {rest ? (
          <RestTimer
            key={rest.key}
            seconds={rest.seconds}
            onDone={() => setRest(null)}
            onDismiss={() => setRest(null)}
          />
        ) : null}
        <Button title="Завершить тренировку" onPress={doFinish} />
      </View>

      {plate != null ? <PlateCalculator weight={plate} onClose={() => setPlate(null)} /> : null}

      {coachExercise ? (
        <CoachSheet
          scope="exercise"
          title={coachExercise.name_ru}
          subtitle="Упражнение"
          exerciseName={coachExercise.name_ru}
          muscleRu={getExercise(coachExercise.exercise_id)?.muscleRu}
          gifImages={getExercise(coachExercise.exercise_id)?.images}
          cues={getExercise(coachExercise.exercise_id)?.cues}
          onClose={() => setCoachExercise(null)}
        />
      ) : null}

      {coachWorkout ? (
        <CoachSheet
          scope="workout"
          title={day.title}
          subtitle="Тренировка"
          workoutTitle={day.title}
          exercises={day.exercises.map((e) => e.name_ru)}
          onClose={() => setCoachWorkout(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.three,
  },
  content: { paddingHorizontal: Spacing.five, paddingTop: Spacing.two, paddingBottom: Spacing.eight, gap: Spacing.four },
  exHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  hint: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.md, marginTop: Spacing.three },
  gridHead: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.three, paddingHorizontal: Spacing.one },
  colNum: { width: 36, textAlign: 'center' },
  colInput: { flex: 1, paddingHorizontal: Spacing.one },
  colCheck: { width: 52, alignItems: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.two },
  input: {
    height: 46,
    borderRadius: Radius.md,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
  },
  check: { width: 40, height: 40, borderRadius: Radius.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: Spacing.five, paddingTop: Spacing.three, gap: Spacing.three },
});
