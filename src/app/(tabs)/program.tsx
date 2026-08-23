import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { CalendarDays, Check, Dumbbell, Play, RefreshCw } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Divider, PressableScale, ProgressBar, Screen, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { extendProgram, type LoadedDay } from '@/lib/db/programs';
import { cycleProgress } from '@/lib/mesocycle';
import { useActiveProgram } from '@/lib/hooks/use-active-program';

const PHASE_RU: Record<string, string> = {
  cut: 'Сушка',
  bulk: 'Набор массы',
  recomp: 'Рельеф + сила',
  maintain: 'Поддержание',
};

export default function ProgramScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: program, isLoading } = useActiveProgram();

  if (isLoading) {
    return (
      <Screen title="Программа" tabBarSpacing>
        <Txt variant="body" color="textSecondary">
          Загрузка…
        </Txt>
      </Screen>
    );
  }

  if (!program) {
    return (
      <Screen title="Программа" tabBarSpacing>
        <Card padding="eight">
          <View style={{ alignItems: 'center', gap: Spacing.three }}>
            <CalendarDays size={40} color={theme.textTertiary} strokeWidth={1.6} />
            <Txt variant="subtitle" center>
              Пока нет программы
            </Txt>
            <Txt variant="body" color="textSecondary" center>
              Сгенерируй недельный план — он появится здесь с разбивкой по дням.
            </Txt>
            <Button title="Сгенерировать" onPress={() => router.push('/new-program')} fullWidth={false} />
          </View>
        </Card>
      </Screen>
    );
  }

  const cycle = cycleProgress(program);

  return (
    <Screen
      title={program.name}
      subtitle={
        program.weeks
          ? `${program.days.length} тренировки в круге · ${program.weeks} кругов`
          : `${program.days.length} тренировки в круге`
      }
      tabBarSpacing>
      {program.phase ? (
        <Card variant="accent" padding="five">
          <View style={styles.phaseHead}>
            <Txt variant="micro" color="accent">
              Фаза: {PHASE_RU[program.phase] ?? program.phase}
            </Txt>
            {program.weeks ? (
              <Txt variant="micro" color="textTertiary">
                Круг {cycle.cycle} из {cycle.totalCycles}
              </Txt>
            ) : null}
          </View>
          {program.phase_reason ? (
            <Txt variant="body" color="textSecondary" style={{ marginTop: Spacing.two }}>
              {program.phase_reason}
            </Txt>
          ) : null}
          {program.weeks ? (
            <View style={{ marginTop: Spacing.three, gap: Spacing.two }}>
              <ProgressBar progress={cycle.progress} />
              <Txt variant="caption" color="textTertiary">
                {cycle.done} из {cycle.totalSessions} тренировок · круг = проход по всем дням
              </Txt>
              {cycle.complete ? (
                <View style={{ gap: Spacing.two, marginTop: Spacing.two }}>
                  <View style={styles.doneRow}>
                    <Check size={16} color={theme.success} />
                    <Txt variant="label" color="success">
                      Программа пройдена! Что дальше?
                    </Txt>
                  </View>
                  <Button
                    title="Продолжить — ещё +2 недели"
                    onPress={() => {
                      extendProgram(program.id, 2);
                      queryClient.invalidateQueries({ queryKey: ['activeProgram'] });
                    }}
                  />
                  <Button title="Перегенерировать программу" variant="secondary" onPress={() => router.push('/new-program')} />
                </View>
              ) : null}
            </View>
          ) : null}
        </Card>
      ) : null}

      {program.days.map((day) => (
        <DayCard key={day.id} day={day} onStart={() => router.push(`/workout/${day.id}`)} />
      ))}

      <Button
        title="Перегенерировать программу"
        variant="secondary"
        icon={<RefreshCw size={16} color={theme.text} />}
        onPress={() => router.push('/new-program')}
        style={{ marginTop: Spacing.two }}
      />
    </Screen>
  );
}

export function DayCard({ day, onStart }: { day: LoadedDay; onStart: () => void }) {
  const theme = useTheme();
  return (
    <Card padding="five">
      <View style={styles.dayHead}>
        <View style={{ flex: 1 }}>
          <Txt variant="subtitle">{day.title}</Txt>
          {day.focus ? (
            <Txt variant="caption" color="accent" style={{ marginTop: 2 }}>
              {day.focus}
            </Txt>
          ) : null}
        </View>
        <PressableScale onPress={onStart} style={[styles.playBtn, { backgroundColor: theme.accent }]}>
          <Play size={18} color={theme.accentOn} fill={theme.accentOn} />
        </PressableScale>
      </View>

      <View style={{ marginTop: Spacing.three, gap: Spacing.three }}>
        {day.exercises.map((ex, i) => (
          <View key={ex.id}>
            {i > 0 ? <Divider /> : null}
            <View style={styles.exRow}>
              <View style={[styles.exIcon, { backgroundColor: theme.backgroundElevated }]}>
                <Dumbbell size={15} color={theme.textSecondary} />
              </View>
              <Txt variant="body" style={{ flex: 1 }} numberOfLines={1}>
                {ex.name_ru}
              </Txt>
              <Txt variant="label" color="textSecondary" rounded>
                {ex.sets}×{ex.rep_min}–{ex.rep_max}
              </Txt>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  phaseHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dayHead: { flexDirection: 'row', alignItems: 'center' },
  playBtn: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: 2 },
  exIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
