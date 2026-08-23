import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ArrowRight, CalendarCheck, ChevronRight, Dumbbell, Play, Sparkles, Utensils } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Button, Card, PressableScale, Screen, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { todayISO, totalsForDate } from '@/lib/db/food';
import { latestMetric } from '@/lib/db/metrics';
import { openSession } from '@/lib/db/sessions';
import { cycleProgress, nextDayIndex } from '@/lib/mesocycle';
import { dailyTargets } from '@/lib/nutrition';
import { useActiveProgram } from '@/lib/hooks/use-active-program';
import { age, PROFILE } from '@/lib/profile';
import { DayCard } from './program';

export default function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: program } = useActiveProgram();

  // Floating schedule: the next session is simply the next day in the rotation,
  // whenever you actually make it to the gym.
  const cycle = program ? cycleProgress(program) : null;
  const today = todayISO();
  const { data: eaten } = useQuery({
    queryKey: ['foodTotals', today],
    queryFn: () => totalsForDate(today),
  });
  const { data: bodyweight } = useQuery({
    queryKey: ['latestMetric'],
    queryFn: () => latestMetric()?.bodyweight ?? PROFILE.fallbackBodyweight,
  });
  const targets = dailyTargets(bodyweight ?? PROFILE.fallbackBodyweight);
  const { data: unfinished } = useQuery({ queryKey: ['openSession'], queryFn: () => openSession() });
  const nextDay = program?.days.length ? program.days[nextDayIndex(program)] : null;

  return (
    <Screen title="Сегодня" subtitle="VOLT" tabBarSpacing>
      {unfinished?.program_day_id ? (
        <PressableScale
          pressedScale={0.98}
          onPress={() => router.push(`/workout/${unfinished.program_day_id}`)}>
          <Card variant="accent" padding="five">
            <View style={styles.heroRow}>
              <Play size={16} color={theme.accent} fill={theme.accent} />
              <Txt variant="micro" color="accent">
                Тренировка не закончена
              </Txt>
            </View>
            <Txt variant="subtitle" style={{ marginTop: Spacing.two }}>
              {unfinished.title ?? 'Тренировка'}
            </Txt>
            <Txt variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
              Нажми, чтобы продолжить с того же места
            </Txt>
          </Card>
        </PressableScale>
      ) : null}

      {program && nextDay ? (
        <>
          <Txt variant="micro" color="textTertiary">
            Следующая тренировка
          </Txt>
          <DayCard day={nextDay} onStart={() => router.push(`/workout/${nextDay.id}`)} />

          <View style={styles.statsRow}>
            <Card style={styles.stat}>
              <CalendarCheck size={18} color={theme.accent} />
              <Txt variant="subtitle" rounded style={{ marginTop: Spacing.two }}>
                Круг {cycle?.cycle ?? 1}
                {cycle?.totalCycles ? ` из ${cycle.totalCycles}` : ''}
              </Txt>
              <Txt variant="caption" color="textSecondary">
                по {cycle?.perCycle ?? 0} тренировки
              </Txt>
            </Card>
            <Card style={styles.stat}>
              <Dumbbell size={18} color={theme.accent} />
              <Txt variant="subtitle" rounded style={{ marginTop: Spacing.two }}>
                {cycle?.done ?? 0}
              </Txt>
              <Txt variant="caption" color="textSecondary">
                тренировок всего
              </Txt>
            </Card>
          </View>
        </>
      ) : (
        <Card variant="accent" padding="six">
          <View style={styles.heroRow}>
            <Sparkles size={20} color={theme.accent} />
            <Txt variant="micro" color="accent">
              AI-тренер
            </Txt>
          </View>
          <Txt variant="heading" style={{ marginTop: Spacing.three }}>
            Соберём программу
          </Txt>
          <Txt variant="body" color="textSecondary" style={{ marginTop: Spacing.two }}>
            {PROFILE.name}, {age()} лет, {PROFILE.heightCm} см, {PROFILE.daysPerWeek} тренировки в
            неделю. Введи рабочие веса — остальное нейросеть посчитает сама.
          </Txt>
          <Button
            title="Создать программу"
            icon={<ArrowRight size={18} color={theme.accentOn} />}
            onPress={() => router.push('/new-program')}
            style={{ marginTop: Spacing.four }}
          />
        </Card>
      )}

      <PressableScale onPress={() => router.push('/food')} pressedScale={0.98}>
        <Card>
          <View style={styles.linkRow}>
            <Utensils size={20} color={theme.accent} />
            <View style={{ flex: 1 }}>
              <Txt variant="bodyStrong">Питание</Txt>
              <Txt variant="caption" color="textSecondary">
                {eaten?.kcal ?? 0} из {targets.kcal} ккал · белок {eaten?.protein ?? 0} из {targets.protein} г
              </Txt>
            </View>
            <ChevronRight size={18} color={theme.textTertiary} />
          </View>
        </Card>
      </PressableScale>

      <PressableScale onPress={() => router.push('/library')} pressedScale={0.98}>
        <Card>
          <View style={styles.linkRow}>
            <Dumbbell size={20} color={theme.accent} />
            <View style={{ flex: 1 }}>
              <Txt variant="bodyStrong">База упражнений</Txt>
              <Txt variant="caption" color="textSecondary">
                1324 упражнения с анимацией
              </Txt>
            </View>
            <ChevronRight size={18} color={theme.textTertiary} />
          </View>
        </Card>
      </PressableScale>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  statsRow: { flexDirection: 'row', gap: Spacing.four },
  stat: { flex: 1, gap: 2 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
});
