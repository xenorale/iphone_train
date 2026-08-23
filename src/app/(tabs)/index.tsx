import { useRouter } from 'expo-router';
import { ArrowRight, ChevronRight, Dumbbell, Sparkles, Target } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Button, Card, PressableScale, Screen, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useActiveProgram } from '@/lib/hooks/use-active-program';
import { useSettings } from '@/lib/store/settings';
import { DayCard } from './program';

const GOAL_LABEL: Record<string, string> = {
  strength: 'Сила',
  muscle: 'Масса',
  fatloss: 'Сушка',
  general: 'Форма',
};

export default function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: program } = useActiveProgram();
  const profile = useSettings((s) => s.profile);

  return (
    <Screen title="Сегодня" subtitle="VOLT" tabBarSpacing>
      {program ? (
        <>
          <Txt variant="micro" color="textTertiary">
            Следующая тренировка
          </Txt>
          <DayCard day={program.days[0]} onStart={() => router.push(`/workout/${program.days[0].id}`)} />

          <View style={styles.statsRow}>
            <Card style={styles.stat}>
              <Target size={18} color={theme.accent} />
              <Txt variant="subtitle" rounded style={{ marginTop: Spacing.two }}>
                {GOAL_LABEL[profile?.goal ?? 'general']}
              </Txt>
              <Txt variant="caption" color="textSecondary">
                цель
              </Txt>
            </Card>
            <Card style={styles.stat}>
              <Dumbbell size={18} color={theme.accent} />
              <Txt variant="subtitle" rounded style={{ marginTop: Spacing.two }}>
                {program.days.length} дн
              </Txt>
              <Txt variant="caption" color="textSecondary">
                в неделю
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
            Составим твою первую программу
          </Txt>
          <Txt variant="body" color="textSecondary" style={{ marginTop: Spacing.two }}>
            Расскажи о своей цели, инвентаре и днях — нейросеть соберёт недельный план под тебя.
          </Txt>
          <Button
            title="Создать программу"
            icon={<ArrowRight size={18} color={theme.accentOn} />}
            onPress={() => router.push('/onboarding')}
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
                Техника, анимации, мышцы
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
