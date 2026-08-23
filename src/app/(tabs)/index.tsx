import { useRouter } from 'expo-router';
import { ArrowRight, CalendarCheck, ChevronRight, Dumbbell, Sparkles } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Button, Card, PressableScale, Screen, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sessionCountSince } from '@/lib/db/sessions';
import { useActiveProgram } from '@/lib/hooks/use-active-program';
import { age, PROFILE } from '@/lib/profile';
import { DayCard } from './program';

export default function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: program } = useActiveProgram();

  // Floating schedule: the next session is simply the next day in the rotation,
  // whenever you actually make it to the gym.
  const done = program ? sessionCountSince(program.created_at) : 0;
  const nextDay = program?.days.length ? program.days[done % program.days.length] : null;
  const week = program?.days.length ? Math.floor(done / program.days.length) + 1 : 1;

  return (
    <Screen title="Сегодня" subtitle="VOLT" tabBarSpacing>
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
                Неделя {program.weeks ? Math.min(week, program.weeks) : week}
              </Txt>
              <Txt variant="caption" color="textSecondary">
                {program.weeks ? `из ${program.weeks}` : 'мезоцикла'}
              </Txt>
            </Card>
            <Card style={styles.stat}>
              <Dumbbell size={18} color={theme.accent} />
              <Txt variant="subtitle" rounded style={{ marginTop: Spacing.two }}>
                {done}
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
