import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus, Trash2, Utensils } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Chip, Divider, IconButton, Input, PressableScale, ProgressBar, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { estimateMacros } from '@/lib/ai/food';
import { useApiKey } from '@/lib/ai/key';
import { AiError } from '@/lib/ai/openrouter';
import {
  addFood,
  deleteFood,
  foodForDate,
  MEAL_LABELS,
  todayISO,
  totalsForDate,
  updateFoodMacros,
  type Meal,
} from '@/lib/db/food';
import { latestMetric } from '@/lib/db/metrics';
import { dailyTargets } from '@/lib/nutrition';
import { PROFILE } from '@/lib/profile';

const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function FoodScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const hasKey = useApiKey((s) => s.hasKey);

  const date = todayISO();
  const [meal, setMeal] = useState<Meal>('breakfast');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: entries = [] } = useQuery({
    queryKey: ['food', date],
    queryFn: () => foodForDate(date),
  });
  const { data: totals } = useQuery({
    queryKey: ['foodTotals', date],
    queryFn: () => totalsForDate(date),
  });

  const bodyweight = latestMetric()?.bodyweight ?? PROFILE.fallbackBodyweight;
  const targets = dailyTargets(bodyweight);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['food', date] });
    queryClient.invalidateQueries({ queryKey: ['foodTotals', date] });
  };

  const onAdd = async () => {
    const value = text.trim();
    if (!value) return;
    setError(null);
    const id = addFood({ date, meal, text: value });
    setText('');
    refresh();

    if (!hasKey) {
      setError('Без ключа OpenRouter калории не посчитать — добавь его в «Ещё».');
      return;
    }
    setBusy(true);
    try {
      const macros = await estimateMacros(value);
      updateFoodMacros(id, macros);
      refresh();
    } catch (e) {
      setError(e instanceof AiError ? e.human : 'Не удалось посчитать калории.');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = (id: string) => {
    deleteFood(id);
    refresh();
  };

  const kcal = totals?.kcal ?? 0;
  const protein = totals?.protein ?? 0;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.topBar}>
          <IconButton onPress={() => router.back()} variant="ghost">
            <ChevronLeft size={22} color={theme.text} />
          </IconButton>
          <Txt variant="subtitle">Питание</Txt>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <Card padding="five">
            <View style={styles.rowBetween}>
              <Txt variant="micro" color="accent">
                Сегодня
              </Txt>
              <Txt variant="micro" color="textTertiary">
                норма {targets.kcal} ккал · {targets.protein} г белка
              </Txt>
            </View>

            <View style={styles.kcalRow}>
              <Txt variant="display" rounded>
                {kcal}
              </Txt>
              <Txt variant="subtitle" color="textSecondary" style={{ marginBottom: 4 }}>
                / {targets.kcal} ккал
              </Txt>
            </View>
            <ProgressBar progress={Math.min(1, kcal / targets.kcal)} height={8} />

            <View style={{ marginTop: Spacing.four, gap: Spacing.two }}>
              <View style={styles.rowBetween}>
                <Txt variant="caption" color="textSecondary">
                  Белок
                </Txt>
                <Txt variant="caption" color={protein >= targets.protein ? 'success' : 'textSecondary'} rounded>
                  {protein} / {targets.protein} г
                </Txt>
              </View>
              <ProgressBar progress={Math.min(1, protein / targets.protein)} height={5} />

              <View style={[styles.rowBetween, { marginTop: Spacing.two }]}>
                <Txt variant="caption" color="textTertiary">
                  Жиры {totals?.fat ?? 0} г · Углеводы {totals?.carbs ?? 0} г
                </Txt>
              </View>
            </View>
          </Card>

          <Card padding="five">
            <Txt variant="micro" color="accent">
              Что съел
            </Txt>
            <View style={styles.chips}>
              {MEALS.map((m) => (
                <Chip key={m} label={MEAL_LABELS[m]} selected={meal === m} onPress={() => setMeal(m)} />
              ))}
            </View>
            <Input
              placeholder="Напр.: гречка с котлетами, салат, компот"
              value={text}
              onChangeText={setText}
              multiline
              style={{ marginTop: Spacing.three }}
            />
            <Button
              title={busy ? 'Считаю…' : 'Добавить'}
              icon={busy ? undefined : <Plus size={16} color={theme.accentOn} />}
              onPress={onAdd}
              disabled={!text.trim() || busy}
              style={{ marginTop: Spacing.three }}
            />
            {error ? (
              <Txt variant="caption" color="danger" style={{ marginTop: Spacing.three }}>
                {error}
              </Txt>
            ) : null}
          </Card>

          {entries.length ? (
            <Card padding="five">
              <Txt variant="micro" color="accent">
                Приёмы пищи
              </Txt>
              <View style={{ marginTop: Spacing.three }}>
                {entries.map((e, i) => (
                  <View key={e.id}>
                    {i > 0 ? <Divider /> : null}
                    <View style={styles.entryRow}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Txt variant="micro" color="textTertiary">
                          {MEAL_LABELS[e.meal]}
                        </Txt>
                        <Txt variant="body" numberOfLines={3}>
                          {e.text}
                        </Txt>
                        {e.kcal != null ? (
                          <Txt variant="caption" color="textSecondary" rounded>
                            {Math.round(e.kcal)} ккал · Б {Math.round(e.protein ?? 0)} · Ж{' '}
                            {Math.round(e.fat ?? 0)} · У {Math.round(e.carbs ?? 0)}
                          </Txt>
                        ) : (
                          <View style={styles.pending}>
                            <ActivityIndicator size="small" color={theme.textTertiary} />
                            <Txt variant="caption" color="textTertiary">
                              считаю…
                            </Txt>
                          </View>
                        )}
                      </View>
                      <PressableScale haptic={false} onPress={() => onDelete(e.id)}>
                        <Trash2 size={16} color={theme.textTertiary} />
                      </PressableScale>
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          ) : (
            <Card padding="eight">
              <View style={{ alignItems: 'center', gap: Spacing.three }}>
                <Utensils size={36} color={theme.textTertiary} strokeWidth={1.6} />
                <Txt variant="body" color="textSecondary" center>
                  Запиши что ел — ИИ сам прикинет калории и белок.
                </Txt>
              </View>
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  content: { padding: Spacing.five, gap: Spacing.four, paddingBottom: Spacing.eight },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kcalRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two, marginTop: Spacing.two, marginBottom: Spacing.three },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.three },
  entryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, paddingVertical: Spacing.three },
  pending: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
