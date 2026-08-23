import { ChevronLeft, Check, Repeat2, Scale, Sparkles } from 'lucide-react-native';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ExerciseGif } from '@/components/exercise-gif';
import { MuscleMap } from '@/components/muscle-map';
import { SetHistory } from '@/components/set-history';
import { Button, Card, IconButton, PressableScale, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getExercise } from '@/lib/catalog';
import type { Suggestion } from '@/lib/progression';
import type { ProgramExerciseRow } from '@/lib/types';

export type SetEntry = { id?: string; weight: string; reps: string; done: boolean };

export type ExerciseRunnerProps = {
  pex: ProgramExerciseRow;
  sets: SetEntry[];
  suggestion?: Suggestion;
  position: { index: number; total: number };
  onPatchSet: (idx: number, patch: Partial<SetEntry>) => void;
  onToggleDone: (idx: number) => void;
  onRepeatPrevious: (idx: number) => void;
  onPickHistorySet: (weight: number | null, reps: number | null) => void;
  onSwap: () => void;
  onPlates: () => void;
  onCoach: () => void;
  onBack: () => void;
  onNext: () => void;
};

/**
 * One exercise, full screen. Everything for the set you're doing right now —
 * the overview screen stays a plain list so neither view is cluttered.
 */
export function ExerciseRunner({
  pex,
  sets,
  suggestion,
  position,
  onPatchSet,
  onToggleDone,
  onRepeatPrevious,
  onPickHistorySet,
  onSwap,
  onPlates,
  onCoach,
  onBack,
  onNext,
}: ExerciseRunnerProps) {
  const theme = useTheme();
  const exercise = getExercise(pex.exercise_id);
  const doneCount = sets.filter((s) => s.done).length;
  const isLast = position.index === position.total - 1;

  return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <IconButton onPress={onBack} variant="ghost">
          <ChevronLeft size={22} color={theme.text} />
        </IconButton>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt variant="caption" color="textTertiary">
            Упражнение {position.index + 1} из {position.total}
          </Txt>
          <Txt variant="subtitle" numberOfLines={1}>
            {pex.name_ru}
          </Txt>
        </View>
        <IconButton size={44} variant="ghost" onPress={onCoach}>
          <Sparkles size={20} color={theme.accent} />
        </IconButton>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <ExerciseGif exerciseId={pex.exercise_id} height={200} />

        {exercise ? (
          <MuscleMap target={exercise.muscle} secondary={exercise.secondaryRu} height={104} showLabels={false} />
        ) : null}

        <View style={styles.actions}>
          <PressableScale onPress={onSwap} style={[styles.action, { backgroundColor: theme.backgroundElement }]}>
            <Repeat2 size={16} color={theme.textSecondary} />
            <Txt variant="label" color="textSecondary">
              Заменить
            </Txt>
          </PressableScale>
          <PressableScale onPress={onPlates} style={[styles.action, { backgroundColor: theme.backgroundElement }]}>
            <Scale size={16} color={theme.textSecondary} />
            <Txt variant="label" color="textSecondary">
              Блины
            </Txt>
          </PressableScale>
        </View>

        {suggestion?.reason ? (
          <View style={[styles.hint, { backgroundColor: theme.accentMuted }]}>
            <Txt variant="caption" color="accent">
              {suggestion.reason}
            </Txt>
          </View>
        ) : null}

        <Card padding="four">
          <View style={styles.cardHead}>
            <Txt variant="micro" color="accent">
              Подходы
            </Txt>
            <Txt variant="micro" color="textTertiary">
              цель {pex.sets} × {pex.rep_min}–{pex.rep_max}
              {pex.rest_seconds ? ` · отдых ${pex.rest_seconds} с` : ''}
            </Txt>
          </View>

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
              <PressableScale
                pressedScale={0.85}
                onPress={() => onRepeatPrevious(i)}
                style={[styles.colNum, styles.numBtn, { backgroundColor: theme.backgroundElevated }]}>
                <Txt variant="label" color="textSecondary">
                  {i + 1}
                </Txt>
              </PressableScale>
              <View style={styles.colInput}>
                <TextInput
                  value={s.weight}
                  onChangeText={(t) => onPatchSet(i, { weight: t })}
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
                  onChangeText={(t) => onPatchSet(i, { reps: t })}
                  keyboardType="numeric"
                  placeholder={String(pex.rep_min ?? '')}
                  placeholderTextColor={theme.textTertiary}
                  selectionColor={theme.accent}
                  style={[styles.input, { backgroundColor: theme.backgroundElevated, color: theme.text }]}
                />
              </View>
              <View style={styles.colCheck}>
                <PressableScale
                  onPress={() => onToggleDone(i)}
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

        <Card padding="four">
          <Txt variant="micro" color="textTertiary" style={{ marginBottom: Spacing.two }}>
            Прошлые тренировки · нажми, чтобы подставить
          </Txt>
          <SetHistory
            exerciseId={pex.exercise_id}
            limit={5}
            emptyHint="Это упражнение ещё не делал"
            onPickSet={onPickHistorySet}
          />
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={isLast ? 'К списку упражнений' : 'Следующее упражнение'}
          variant={doneCount === sets.length ? 'primary' : 'secondary'}
          onPress={isLast ? onBack : onNext}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  content: { paddingHorizontal: Spacing.five, paddingBottom: Spacing.eight, gap: Spacing.four },
  actions: { flexDirection: 'row', gap: Spacing.three },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 42,
    borderRadius: Radius.md,
  },
  hint: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gridHead: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.three, paddingHorizontal: Spacing.one },
  colNum: { width: 36, alignItems: 'center', justifyContent: 'center' },
  numBtn: { height: 46, borderRadius: Radius.md },
  colInput: { flex: 1, paddingHorizontal: Spacing.one },
  colCheck: { width: 52, alignItems: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.two, gap: 2 },
  input: { height: 46, borderRadius: Radius.md, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  check: { width: 40, height: 40, borderRadius: Radius.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: Spacing.five, paddingTop: Spacing.three, paddingBottom: Spacing.two },
});
