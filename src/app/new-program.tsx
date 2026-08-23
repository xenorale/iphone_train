import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronLeft, Sparkles } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Button, Card, IconButton, Input, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApiKey } from '@/lib/ai/key';
import { AiError } from '@/lib/ai/openrouter';
import { estimateOneRm, generateProgram } from '@/lib/ai/program';
import { latestMetric } from '@/lib/db/metrics';
import { saveProgram } from '@/lib/db/programs';
import { age, PROFILE } from '@/lib/profile';
import { useSettings } from '@/lib/store/settings';
import type { StrengthAnchors } from '@/lib/types';

const FIELDS: { key: keyof StrengthAnchors; label: string; hint: string }[] = [
  { key: 'chest', label: 'Жим лёжа', hint: 'напр. 80' },
  { key: 'legs', label: 'Присед / жим ногами', hint: 'напр. 120' },
  { key: 'back', label: 'Тяга в наклоне', hint: 'напр. 80' },
  { key: 'biceps', label: 'Подъём на бицепс', hint: 'напр. 30' },
  { key: 'triceps', label: 'Разгибания / жим узким', hint: 'напр. 40' },
];

const num = (s: string): number | undefined => {
  const v = parseFloat(s.replace(',', '.'));
  return Number.isFinite(v) && v > 0 ? v : undefined;
};

export default function NewProgramScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const hasKey = useApiKey((s) => s.hasKey);
  const { strength, setStrength } = useSettings();

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(FIELDS.map((f) => [f.key, strength[f.key] != null ? String(strength[f.key]) : ''])),
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bodyweight = latestMetric()?.bodyweight ?? PROFILE.fallbackBodyweight;

  const onGenerate = async () => {
    if (!hasKey) {
      setError('Сначала добавь ключ OpenRouter в разделе «Ещё».');
      return;
    }
    const anchors: StrengthAnchors = {
      chest: num(values.chest),
      legs: num(values.legs),
      back: num(values.back),
      biceps: num(values.biceps),
      triceps: num(values.triceps),
    };
    setStrength(anchors);
    setError(null);
    setGenerating(true);
    try {
      const program = await generateProgram({ strength: anchors, bodyweight });
      saveProgram(program);
      await queryClient.invalidateQueries({ queryKey: ['activeProgram'] });
      router.replace('/program');
    } catch (e) {
      console.warn('generateProgram failed:', e);
      setError(e instanceof AiError ? e.human : 'Не удалось создать программу. Попробуй ещё раз.');
    } finally {
      setGenerating(false);
    }
  };

  if (generating) return <Generating />;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <IconButton onPress={() => router.back()} variant="ghost">
          <ChevronLeft size={22} color={theme.text} />
        </IconButton>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={{ gap: Spacing.one }}>
          <Txt variant="title">Новая программа</Txt>
          <Txt variant="body" color="textSecondary">
            {PROFILE.name}, {age()} лет · {PROFILE.heightCm} см · {bodyweight} кг ·{' '}
            {PROFILE.daysPerWeek} тренировки в неделю
          </Txt>
        </View>

        <Card variant="surface" padding="five">
          <Txt variant="micro" color="accent">
            Рабочие веса
          </Txt>
          <Txt variant="caption" color="textSecondary" style={{ marginTop: Spacing.two }}>
            Вес, с которым делаешь 6–8 повторов, не разовый максимум. От них считаются веса во
            всей программе, так что лучше заполнить — иначе всё посчитается от массы тела и может
            не совпасть с твоим реальным уровнем.
          </Txt>

          <View style={{ gap: Spacing.four, marginTop: Spacing.four }}>
            {FIELDS.map((f) => {
              const parsed = num(values[f.key]);
              return (
                <View key={f.key} style={{ gap: 6 }}>
                  <View style={styles.labelRow}>
                    <Txt variant="micro" color="textTertiary">
                      {f.label}, кг
                    </Txt>
                    {parsed ? (
                      <Txt variant="micro" color="accent">
                        1ПМ ≈ {estimateOneRm(parsed)} кг
                      </Txt>
                    ) : null}
                  </View>
                  <Input
                    value={values[f.key]}
                    onChangeText={(t) => setValues((v) => ({ ...v, [f.key]: t }))}
                    keyboardType="numeric"
                    placeholder={f.hint}
                  />
                </View>
              );
            })}
          </View>
        </Card>

        <Card padding="four">
          <Txt variant="caption" color="textSecondary">
            Программа соберётся под рельеф и рост силовых: тяжёлая база с прогрессией, подтягивания
            и брусья вперемешку с железом, пресс в каждой тренировке.
          </Txt>
        </Card>

        {error ? (
          <Card variant="surface" padding="four" style={{ borderColor: theme.danger, borderWidth: 1 }}>
            <Txt variant="caption" color="danger">
              {error}
            </Txt>
          </Card>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Собрать программу"
          icon={<Sparkles size={18} color={theme.accentOn} />}
          onPress={onGenerate}
        />
      </View>
    </SafeAreaView>
  );
}

function Generating() {
  const theme = useTheme();
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(withTiming(1.25, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [scale]);
  const pulse = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <SafeAreaView style={[styles.flex, styles.centerAll, { backgroundColor: theme.background }]}>
      <Animated.View style={[styles.pulse, pulse, { backgroundColor: theme.accentMuted }]}>
        <Sparkles size={34} color={theme.accent} />
      </Animated.View>
      <Txt variant="title" center style={{ marginTop: Spacing.six }}>
        Собираю твою программу…
      </Txt>
      <Txt variant="body" color="textSecondary" center style={{ marginTop: Spacing.two, paddingHorizontal: Spacing.eight }}>
        Подбираю упражнения, подходы и прогрессию
      </Txt>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerAll: { alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  content: { padding: Spacing.five, gap: Spacing.four, paddingBottom: Spacing.eight },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footer: { padding: Spacing.five },
  pulse: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
});
