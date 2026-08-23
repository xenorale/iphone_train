import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LineChart as LineChartIcon, Plus, TrendingDown, TrendingUp, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AddMetricSheet } from '@/components/add-metric-sheet';
import { LineChart } from '@/components/line-chart';
import { Button, Card, Divider, IconButton, PressableScale, Screen, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { allMetrics, deleteMetric, type Measurements } from '@/lib/db/metrics';

const M_LABELS: Record<keyof Measurements, string> = {
  waist: 'Талия',
  chest: 'Грудь',
  arm: 'Рука',
  hip: 'Бёдра',
  thigh: 'Бедро',
};

export default function ProgressScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const unit = 'кг';
  const [sheet, setSheet] = useState(false);

  const { data: metrics = [] } = useQuery({ queryKey: ['metrics'], queryFn: () => allMetrics() });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['metrics'] });

  const withWeight = metrics.filter((m) => m.bodyweight != null);
  const ascending = [...withWeight].reverse();
  const latest = withWeight[0];
  const first = withWeight[withWeight.length - 1];
  const delta = latest && first ? Math.round((latest.bodyweight! - first.bodyweight!) * 10) / 10 : 0;

  const onDelete = (id: string) =>
    Alert.alert('Удалить замер?', '', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          deleteMetric(id);
          refresh();
        },
      },
    ]);

  return (
    <Screen
      title="Прогресс"
      tabBarSpacing
      headerRight={
        <IconButton variant="accent" onPress={() => setSheet(true)}>
          <Plus size={20} color={theme.accentOn} />
        </IconButton>
      }>
      {!metrics.length ? (
        <Card padding="eight">
          <View style={{ alignItems: 'center', gap: Spacing.three }}>
            <LineChartIcon size={40} color={theme.textTertiary} strokeWidth={1.6} />
            <Txt variant="subtitle" center>
              Нет замеров
            </Txt>
            <Txt variant="body" color="textSecondary" center>
              Добавь вес и обхваты — увидишь динамику на графике.
            </Txt>
            <Button title="Добавить замер" onPress={() => setSheet(true)} fullWidth={false} />
          </View>
        </Card>
      ) : (
        <>
          {latest ? (
            <Card padding="five">
              <View style={styles.weightHead}>
                <View>
                  <Txt variant="micro" color="accent">
                    Текущий вес
                  </Txt>
                  <View style={styles.weightRow}>
                    <Txt variant="display" rounded>
                      {latest.bodyweight}
                    </Txt>
                    <Txt variant="subtitle" color="textSecondary" style={{ marginBottom: 4 }}>
                      {unit}
                    </Txt>
                  </View>
                </View>
                {withWeight.length > 1 ? (
                  <View style={[styles.delta, { backgroundColor: delta <= 0 ? theme.successMuted : theme.accentMuted }]}>
                    {delta <= 0 ? (
                      <TrendingDown size={15} color={theme.success} />
                    ) : (
                      <TrendingUp size={15} color={theme.accent} />
                    )}
                    <Txt variant="label" color={delta <= 0 ? 'success' : 'accent'} rounded>
                      {delta > 0 ? '+' : ''}
                      {delta} {unit}
                    </Txt>
                  </View>
                ) : null}
              </View>
              {ascending.length >= 2 ? (
                <View style={{ marginTop: Spacing.four }}>
                  <LineChart values={ascending.map((m) => m.bodyweight!)} />
                </View>
              ) : null}
            </Card>
          ) : null}

          {latest && Object.keys(latest.measurements).length ? (
            <Card padding="five">
              <Txt variant="micro" color="accent">
                Замеры, см
              </Txt>
              <View style={styles.chips}>
                {(Object.keys(latest.measurements) as (keyof Measurements)[]).map((k) => (
                  <View key={k} style={[styles.chip, { backgroundColor: theme.backgroundElevated }]}>
                    <Txt variant="caption" color="textSecondary">
                      {M_LABELS[k]}
                    </Txt>
                    <Txt variant="bodyStrong" rounded>
                      {latest.measurements[k]}
                    </Txt>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          <Card padding="five">
            <Txt variant="micro" color="accent">
              История
            </Txt>
            <View style={{ marginTop: Spacing.three }}>
              {metrics.map((m, i) => (
                <View key={m.id}>
                  {i > 0 ? <Divider /> : null}
                  <View style={styles.historyRow}>
                    <View style={{ flex: 1 }}>
                      <Txt variant="body">
                        {m.bodyweight != null ? `${m.bodyweight} ${unit}` : 'Замеры'}
                      </Txt>
                      <Txt variant="caption" color="textTertiary">
                        {formatDate(m.date)}
                      </Txt>
                    </View>
                    <PressableScale haptic={false} onPress={() => onDelete(m.id)}>
                      <Trash2 size={16} color={theme.textTertiary} />
                    </PressableScale>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        </>
      )}

      {sheet ? <AddMetricSheet unit={unit} onClose={() => setSheet(false)} onSaved={refresh} /> : null}
    </Screen>
  );
}

function formatDate(iso: string) {
  const [y, mo, d] = iso.split('-');
  return `${d}.${mo}.${y}`;
}

const styles = StyleSheet.create({
  weightHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  weightRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.three, paddingVertical: 6, borderRadius: Radius.pill },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.three },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.md, gap: 2, minWidth: 72 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.three },
});
