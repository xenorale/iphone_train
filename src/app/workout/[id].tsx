import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ChevronRight, Minimize2, Sparkles, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoachSheet } from '@/components/coach-sheet';
import { ElapsedTime } from '@/components/elapsed-time';
import { ExerciseRunner, type SetEntry } from '@/components/exercise-runner';
import { ExerciseSwapSheet } from '@/components/exercise-swap-sheet';
import { PlateCalculator } from '@/components/plate-calculator';
import { RestTimer } from '@/components/rest-timer';
import { Button, Card, IconButton, PressableScale, ProgressBar, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getExercise } from '@/lib/catalog';
import { getProgramDay, replaceProgramExercise } from '@/lib/db/programs';
import {
  cancelSession,
  discardIfEmpty,
  finishSession,
  openSessionForDay,
  setsForSession,
  startSession,
  upsertSet,
} from '@/lib/db/sessions';
import { THUMBS } from '@/lib/gif-map';
import { suggestNext, type Suggestion } from '@/lib/progression';
import type { ProgramExerciseRow } from '@/lib/types';

const num = (s: string): number | null => {
  const v = parseFloat(s.replace(',', '.'));
  return Number.isFinite(v) ? v : null;
};
const int = (s: string): number | null => {
  const v = parseInt(s, 10);
  return Number.isFinite(v) ? v : null;
};

const targetOf = (pex: ProgramExerciseRow) => ({
  sets: pex.sets,
  repMin: pex.rep_min ?? 8,
  repMax: pex.rep_max ?? 12,
});

export default function WorkoutScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  // fullScreenModal doesn't always hand SafeAreaView its insets — apply them ourselves
  const insets = useSafeAreaInsets();

  const [day, setDay] = useState(() => getProgramDay(id));
  /** null = overview list, number = that exercise full screen */
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const since = day?.programCreatedAt ?? 0;
  const suggestions = useMemo(() => {
    const m: Record<string, Suggestion> = {};
    for (const pex of day?.exercises ?? []) {
      m[pex.id] = suggestNext(pex.exercise_id, targetOf(pex), day?.programCreatedAt ?? 0);
    }
    return m;
  }, [day]);

  /** Picked up if you left mid-workout and came back. */
  const resumed = useState(() => (day ? openSessionForDay(day.id) : null))[0];

  const [setsState, setSetsState] = useState<Record<string, SetEntry[]>>(() => {
    const map: Record<string, SetEntry[]> = {};
    const saved = resumed ? setsForSession(resumed.id) : [];
    for (const pex of day?.exercises ?? []) {
      const w = suggestNext(pex.exercise_id, targetOf(pex), since).weight ?? pex.start_weight;
      map[pex.id] = Array.from({ length: pex.sets }, (_, i) => {
        const logged = saved.find((r) => r.exercise_id === pex.exercise_id && r.set_index === i);
        if (logged) {
          return {
            id: logged.id,
            weight: logged.weight != null ? String(logged.weight) : '',
            reps: logged.reps != null ? String(logged.reps) : '',
            done: logged.completed === 1,
          };
        }
        return { weight: w != null ? String(w) : '', reps: '', done: false };
      });
    }
    return map;
  });

  const sessionRef = useRef<string | null>(null);
  const finishedRef = useRef(false);
  const [rest, setRest] = useState<{ key: number; seconds: number } | null>(null);
  const [plate, setPlate] = useState<number | null>(null);
  const [coachExercise, setCoachExercise] = useState<ProgramExerciseRow | null>(null);
  const [swapTarget, setSwapTarget] = useState<ProgramExerciseRow | null>(null);
  const [coachWorkout, setCoachWorkout] = useState(false);
  const [startedAt] = useState(() => Date.now());

  const dayId = day?.id;
  const dayTitle = day?.title;
  useEffect(() => {
    if (!dayId || !dayTitle) return;
    // resume the open session instead of piling up a new one every time
    const sid = resumed?.id ?? startSession(dayId, dayTitle);
    sessionRef.current = sid;
    return () => {
      // leaving mid-workout keeps it open so it can be resumed; empty ones go away
      if (!finishedRef.current) discardIfEmpty(sid);
    };
  }, [dayId, dayTitle, resumed]);

  const patchSet = useCallback(
    (pexId: string, idx: number, patch: Partial<SetEntry>) =>
      setSetsState((prev) => ({
        ...prev,
        [pexId]: prev[pexId].map((s, i) => (i === idx ? { ...s, ...patch } : s)),
      })),
    [],
  );

  if (!day) {
    return (
      <View
        style={[
          styles.flex,
          styles.center,
          { backgroundColor: theme.background, paddingTop: insets.top },
        ]}>
        <Txt variant="body" color="textSecondary">
          Тренировка не найдена
        </Txt>
        <Button
          title="Назад"
          variant="secondary"
          fullWidth={false}
          onPress={() => router.back()}
          style={{ marginTop: Spacing.four }}
        />
      </View>
    );
  }

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

  /** Copy the previous set's numbers into this row — the usual "same again" case. */
  const repeatPrevious = (pexId: string, idx: number) => {
    const rows = setsState[pexId];
    const src = idx > 0 ? rows[idx - 1] : null;
    if (src) {
      patchSet(pexId, idx, { weight: src.weight, reps: src.reps });
      return;
    }
    const sug = suggestions[pexId];
    if (sug?.weight != null) patchSet(pexId, idx, { weight: String(sug.weight) });
  };

  /** Fill the first not-yet-completed row from a historical set. */
  const applyHistorySet = (pexId: string, weight: number | null, reps: number | null) => {
    const rows = setsState[pexId] ?? [];
    const idx = rows.findIndex((r) => !r.done);
    if (idx === -1) return;
    patchSet(pexId, idx, {
      weight: weight != null ? String(weight) : '',
      reps: reps != null ? String(reps) : '',
    });
  };

  const swapExercise = (pexId: string, exerciseId: string, nameRu: string) => {
    replaceProgramExercise(pexId, exerciseId, nameRu);
    const fresh = getProgramDay(day.id);
    setDay(fresh);
    const pex = fresh?.exercises.find((e) => e.id === pexId);
    if (pex) {
      const w = suggestNext(pex.exercise_id, targetOf(pex), since).weight ?? pex.start_weight;
      setSetsState((prev) => ({
        ...prev,
        [pexId]: Array.from({ length: pex.sets }, () => ({
          weight: w != null ? String(w) : '',
          reps: '',
          done: false,
        })),
      }));
    }
    queryClient.invalidateQueries({ queryKey: ['activeProgram'] });
    setSwapTarget(null);
  };

  const allEntries = Object.values(setsState).flat();
  const completedCount = allEntries.filter((s) => s.done).length;
  const totalCount = allEntries.length;
  const pct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  const doMinimize = () => {
    finishedRef.current = true;
    if (sessionRef.current) discardIfEmpty(sessionRef.current);
    queryClient.invalidateQueries();
    router.back();
  };

  const doCancel = () => {
    Alert.alert('Отменить тренировку?', 'Всё, что отмечено, будет удалено.', [
      { text: 'Продолжить', style: 'cancel' },
      {
        text: 'Отменить тренировку',
        style: 'destructive',
        onPress: () => {
          finishedRef.current = true;
          if (sessionRef.current) cancelSession(sessionRef.current);
          queryClient.invalidateQueries();
          router.back();
        },
      },
    ]);
  };

  const doFinish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const sid = sessionRef.current;
    if (sid) finishSession(sid);
    queryClient.invalidateQueries();
    // finishSession drops sessions with nothing logged — no summary for those
    if (sid && completedCount > 0) router.replace(`/summary/${sid}`);
    else router.back();
  };

  const active = activeIndex != null ? day.exercises[activeIndex] : null;
  const timer = rest ? (
    <RestTimer
      key={rest.key}
      seconds={rest.seconds}
      onDone={() => setRest(null)}
      onDismiss={() => setRest(null)}
    />
  ) : null;

  return (
    <View
      style={[
        styles.flex,
        { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}>
      {active ? (
        <ExerciseRunner
          pex={active}
          sets={setsState[active.id] ?? []}
          suggestion={suggestions[active.id]}
          position={{ index: activeIndex!, total: day.exercises.length }}
          onPatchSet={(idx, patch) => patchSet(active.id, idx, patch)}
          onToggleDone={(idx) => toggleDone(active.id, idx)}
          onRepeatPrevious={(idx) => repeatPrevious(active.id, idx)}
          onPickHistorySet={(w, r) => applyHistorySet(active.id, w, r)}
          onSwap={() => setSwapTarget(active)}
          onPlates={() => setPlate(num(setsState[active.id]?.[0]?.weight ?? '') ?? 20)}
          onCoach={() => setCoachExercise(active)}
          onBack={() => setActiveIndex(null)}
          onNext={() => setActiveIndex((i) => Math.min(day.exercises.length - 1, (i ?? 0) + 1))}
        />
      ) : (
        <>
          <View style={styles.header}>
            <IconButton onPress={doMinimize} variant="ghost">
              <Minimize2 size={20} color={theme.text} />
            </IconButton>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Txt variant="subtitle" numberOfLines={1}>
                {day.title}
              </Txt>
              <ElapsedTime startedAt={startedAt} prefix={`${completedCount} из ${totalCount} подходов · `} />
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

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {day.exercises.map((pex, index) => {
              const sets = setsState[pex.id] ?? [];
              const done = sets.filter((s) => s.done).length;
              const complete = done === sets.length && sets.length > 0;
              return (
                <PressableScale key={pex.id} pressedScale={0.98} onPress={() => setActiveIndex(index)}>
                  <Card padding="three">
                    <View style={styles.row}>
                      <Image
                        source={THUMBS[pex.exercise_id]}
                        style={styles.thumb}
                        contentFit="cover"
                        transition={120}
                        cachePolicy="memory-disk"
                      />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Txt variant="bodyStrong" numberOfLines={2}>
                          {pex.name_ru}
                        </Txt>
                        <Txt variant="caption" color="textSecondary">
                          {getExercise(pex.exercise_id)?.muscleRu} · {pex.sets} × {pex.rep_min}–{pex.rep_max}
                        </Txt>
                      </View>
                      {complete ? (
                        <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                          <Check size={15} color={theme.accentOn} strokeWidth={3} />
                        </View>
                      ) : (
                        <Txt variant="label" color={done ? 'accent' : 'textTertiary'} rounded>
                          {done}/{sets.length}
                        </Txt>
                      )}
                      <ChevronRight size={18} color={theme.textTertiary} />
                    </View>
                  </Card>
                </PressableScale>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            {timer}
            <Button title="Завершить тренировку" onPress={doFinish} />
            <Button
              title="Отменить тренировку"
              variant="ghost"
              icon={<Trash2 size={15} color={theme.danger} />}
              onPress={doCancel}
            />
          </View>
        </>
      )}

      {/* rest timer floats above the runner so it survives switching exercises */}
      {active && rest ? <View style={styles.floatingTimer}>{timer}</View> : null}

      {plate != null ? <PlateCalculator weight={plate} onClose={() => setPlate(null)} /> : null}

      {swapTarget ? (
        <ExerciseSwapSheet
          exerciseId={swapTarget.exercise_id}
          onPick={(ex) => swapExercise(swapTarget.id, ex.id, ex.nameRu)}
          onClose={() => setSwapTarget(null)}
        />
      ) : null}

      {coachExercise ? (
        <CoachSheet
          scope="exercise"
          title={coachExercise.name_ru}
          subtitle="Упражнение"
          exerciseName={coachExercise.name_ru}
          muscleRu={getExercise(coachExercise.exercise_id)?.muscleRu}
          exerciseId={coachExercise.exercise_id}
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
    </View>
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
  content: { paddingHorizontal: Spacing.five, paddingBottom: Spacing.six, gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  thumb: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: '#222' },
  badge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: Spacing.five, paddingTop: Spacing.three, gap: Spacing.three },
  floatingTimer: { position: 'absolute', left: Spacing.five, right: Spacing.five, bottom: 84 },
});
