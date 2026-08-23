import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ChevronRight, Sparkles, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoachSheet } from '@/components/coach-sheet';
import { ExerciseRunner, type SetEntry } from '@/components/exercise-runner';
import { ExerciseSwapSheet } from '@/components/exercise-swap-sheet';
import { PlateCalculator } from '@/components/plate-calculator';
import { RestTimer } from '@/components/rest-timer';
import { Button, Card, IconButton, PressableScale, ProgressBar, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getExercise } from '@/lib/catalog';
import { getProgramDay, replaceProgramExercise } from '@/lib/db/programs';
import { finishSession, startSession, upsertSet } from '@/lib/db/sessions';
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

  const [day, setDay] = useState(() => getProgramDay(id));
  /** null = overview list, number = that exercise full screen */
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const suggestions = useMemo(() => {
    const m: Record<string, Suggestion> = {};
    for (const pex of day?.exercises ?? []) m[pex.id] = suggestNext(pex.exercise_id, targetOf(pex));
    return m;
  }, [day]);

  const [setsState, setSetsState] = useState<Record<string, SetEntry[]>>(() => {
    const map: Record<string, SetEntry[]> = {};
    for (const pex of day?.exercises ?? []) {
      const w = suggestNext(pex.exercise_id, targetOf(pex)).weight ?? pex.start_weight;
      map[pex.id] = Array.from({ length: pex.sets }, () => ({
        weight: w != null ? String(w) : '',
        reps: '',
        done: false,
      }));
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
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const dayId = day?.id;
  const dayTitle = day?.title;
  useEffect(() => {
    if (!dayId || !dayTitle) return;
    const sid = startSession(dayId, dayTitle);
    sessionRef.current = sid;
    return () => {
      if (!finishedRef.current) finishSession(sid);
    };
  }, [dayId, dayTitle]);

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
      <SafeAreaView style={[styles.flex, styles.center, { backgroundColor: theme.background }]}>
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
      </SafeAreaView>
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
      const w = suggestNext(pex.exercise_id, targetOf(pex)).weight ?? pex.start_weight;
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
  const elapsed = Math.floor((now - startedAt) / 1000);
  const elapsedStr = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;

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
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
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
  content: { paddingHorizontal: Spacing.five, paddingBottom: Spacing.six, gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  thumb: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: '#222' },
  badge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: Spacing.five, paddingTop: Spacing.three, gap: Spacing.three },
  floatingTimer: { position: 'absolute', left: Spacing.five, right: Spacing.five, bottom: 84 },
});
