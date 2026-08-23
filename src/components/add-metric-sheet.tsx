import { X } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button, IconButton, Input, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addMetric, type Measurements } from '@/lib/db/metrics';

const num = (s: string): number | undefined => {
  const v = parseFloat(s.replace(',', '.'));
  return Number.isFinite(v) ? v : undefined;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const FIELDS: { key: keyof Measurements; label: string }[] = [
  { key: 'waist', label: 'Талия' },
  { key: 'chest', label: 'Грудь' },
  { key: 'arm', label: 'Рука' },
  { key: 'hip', label: 'Бёдра' },
  { key: 'thigh', label: 'Бедро' },
];

export function AddMetricSheet({
  unit,
  onClose,
  onSaved,
}: {
  unit: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const theme = useTheme();
  const [weight, setWeight] = useState('');
  const [m, setM] = useState<Record<string, string>>({});

  const save = () => {
    const measurements: Measurements = {};
    for (const f of FIELDS) {
      const v = num(m[f.key] ?? '');
      if (v != null) measurements[f.key] = v;
    }
    addMetric({ date: todayISO(), bodyweight: num(weight) ?? null, measurements });
    onSaved();
    onClose();
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fill}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: theme.backgroundElevated, borderColor: theme.border }]}>
            <View style={styles.head}>
              <Txt variant="heading">Новый замер</Txt>
              <IconButton onPress={onClose} variant="ghost">
                <X size={20} color={theme.textSecondary} />
              </IconButton>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Txt variant="micro" color="accent" style={{ marginBottom: Spacing.two }}>
                Вес тела ({unit})
              </Txt>
              <Input
                placeholder="напр. 78.5"
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                autoFocus
              />

              <Txt variant="micro" color="accent" style={{ marginTop: Spacing.five, marginBottom: Spacing.two }}>
                Замеры, см (необязательно)
              </Txt>
              <View style={styles.grid}>
                {FIELDS.map((f) => (
                  <View key={f.key} style={styles.cell}>
                    <Txt variant="caption" color="textSecondary" style={{ marginBottom: 6 }}>
                      {f.label}
                    </Txt>
                    <Input
                      placeholder="—"
                      value={m[f.key] ?? ''}
                      onChangeText={(t) => setM((cur) => ({ ...cur, [f.key]: t }))}
                      keyboardType="numeric"
                    />
                  </View>
                ))}
              </View>

              <Button
                title="Сохранить"
                onPress={save}
                disabled={!num(weight) && Object.keys(m).length === 0}
                style={{ marginTop: Spacing.six }}
              />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.five,
    maxHeight: '88%',
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.four },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  cell: { width: '47%', flexGrow: 1 },
});
